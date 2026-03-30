import { Router, type IRouter } from "express";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";

const PYTHON_SCRIPT = process.env["PYTHON_SCRIPT_PATH"] ?? (() => {
  const isDev = process.env["NODE_ENV"] === "development";
  return isDev
    ? path.resolve(process.cwd(), "src/python/mapreduce.py")
    : path.resolve(process.cwd(), "dist/python/mapreduce.py");
})();

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

function runPythonAnalysis(csvFiles: Array<{ filename: string; content: string }>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const python = spawn("python3", [PYTHON_SCRIPT]);
    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    python.on("close", (code: number) => {
      if (code !== 0) {
        reject(new Error(`MapReduce process exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        reject(new Error(`Failed to parse MapReduce output: ${stdout}`));
      }
    });

    python.on("error", (err: Error) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    const input = JSON.stringify(csvFiles);
    python.stdin.write(input);
    python.stdin.end();
  });
}

router.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No CSV files uploaded" });
      return;
    }

    const csvFiles = files.map((f) => ({
      filename: f.originalname,
      content: f.buffer.toString("utf-8"),
    }));

    const result = await runPythonAnalysis(csvFiles);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during analysis";
    req.log.error({ err }, "Analysis failed");
    res.status(500).json({ error: message });
  }
});

export default router;
