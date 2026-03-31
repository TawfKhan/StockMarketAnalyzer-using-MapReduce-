import { Router, type IRouter } from "express";
import multer, { MulterError } from "multer";
import { spawn } from "child_process";
import path from "path";
import { UploadAndAnalyzeResponse } from "@workspace/api-zod";

const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_FILE_COUNT = 20;
const DEFAULT_MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024;
const DEFAULT_ANALYSIS_TIMEOUT_MS = 60_000;

function parsePositiveInteger(
  value: string | undefined,
  fallbackValue: number,
): number {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

const MAX_FILE_SIZE_BYTES = parsePositiveInteger(
  process.env["MAX_UPLOAD_FILE_SIZE_BYTES"],
  DEFAULT_MAX_FILE_SIZE_BYTES,
);
const MAX_FILE_COUNT = parsePositiveInteger(
  process.env["MAX_UPLOAD_FILE_COUNT"],
  DEFAULT_MAX_FILE_COUNT,
);
const MAX_TOTAL_UPLOAD_BYTES = parsePositiveInteger(
  process.env["MAX_TOTAL_UPLOAD_BYTES"],
  DEFAULT_MAX_TOTAL_UPLOAD_BYTES,
);
const ANALYSIS_TIMEOUT_MS = parsePositiveInteger(
  process.env["ANALYSIS_TIMEOUT_MS"],
  DEFAULT_ANALYSIS_TIMEOUT_MS,
);

const PYTHON_EXECUTABLE =
  process.env["PYTHON_EXECUTABLE"] ??
  (process.platform === "win32" ? "python" : "python3");

const PYTHON_SCRIPT = process.env["PYTHON_SCRIPT_PATH"] ?? (() => {
  const isDev = process.env["NODE_ENV"] === "development";
  return isDev
    ? path.resolve(process.cwd(), "src/python/mapreduce.py")
    : path.resolve(process.cwd(), "dist/python/mapreduce.py");
})();

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILE_COUNT,
  },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".csv")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only CSV files are allowed"));
  },
});

function getMulterErrorMessage(error: MulterError): string {
  if (error.code === "LIMIT_FILE_SIZE") {
    return `Each file must be <= ${MAX_FILE_SIZE_BYTES} bytes.`;
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return `Upload at most ${MAX_FILE_COUNT} files per request.`;
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return "Unexpected upload field. Use multipart field name \"files\".";
  }

  return error.message;
}

type AnalysisResponse = ReturnType<(typeof UploadAndAnalyzeResponse)["parse"]>;

function runPythonAnalysis(
  csvFiles: Array<{ filename: string; content: string }>,
): Promise<AnalysisResponse> {
  return new Promise((resolve, reject) => {
    const python = spawn(PYTHON_EXECUTABLE, [PYTHON_SCRIPT]);

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      python.kill();
      if (!settled) {
        settled = true;
        reject(
          new Error(
            `MapReduce process timed out after ${ANALYSIS_TIMEOUT_MS} ms.`,
          ),
        );
      }
    }, ANALYSIS_TIMEOUT_MS);

    const resolveOnce = (value: AnalysisResponse) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      }
    };

    const rejectOnce = (error: Error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    };

    python.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    python.on("close", (code: number) => {
      if (code !== 0) {
        rejectOnce(
          new Error(`MapReduce process exited with code ${code}: ${stderr}`),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const result = UploadAndAnalyzeResponse.parse(parsed);
        resolveOnce(result);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Failed to parse MapReduce output: ${stdout}`;
        rejectOnce(new Error(message));
      }
    });

    python.on("error", (error: Error) => {
      rejectOnce(
        new Error(
          `Failed to start Python process using \"${PYTHON_EXECUTABLE}\": ${error.message}`,
        ),
      );
    });

    python.stdin.on("error", (error: Error) => {
      rejectOnce(new Error(`Failed writing to Python stdin: ${error.message}`));
    });

    const input = JSON.stringify(csvFiles);
    python.stdin.write(input);
    python.stdin.end();
  });
}

router.post(
  "/upload",
  (req, res, next) => {
    upload.array("files")(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof MulterError) {
        res.status(400).json({ error: getMulterErrorMessage(error) });
        return;
      }

      const message =
        error instanceof Error ? error.message : "Invalid upload payload";
      res.status(400).json({ error: message });
    });
  },
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: "No CSV files uploaded" });
        return;
      }

      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
        res.status(413).json({
          error: `Total upload size exceeds ${MAX_TOTAL_UPLOAD_BYTES} bytes.`,
        });
        return;
      }

      const emptyFiles = files.filter((file) => file.size === 0);
      if (emptyFiles.length > 0) {
        res.status(400).json({
          error: `Empty CSV file(s) are not allowed: ${emptyFiles
            .map((file) => file.originalname)
            .join(", ")}`,
        });
        return;
      }

      const csvFiles = files.map((file, index) => {
        const safeName = path.basename(file.originalname).trim();
        return {
          filename: safeName || `upload-${index + 1}.csv`,
          content: file.buffer.toString("utf-8"),
        };
      });

      const result = await runPythonAnalysis(csvFiles);
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during analysis";
      req.log.error({ err: error }, "Analysis failed");
      res.status(500).json({ error: message });
    }
  },
);

export default router;
