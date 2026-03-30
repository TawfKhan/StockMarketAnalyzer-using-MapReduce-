import React, { useEffect, useState, useRef } from 'react';
import { TerminalSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAPREDUCE_LOGS = [
  { text: "Initializing Hadoop cluster environment...", delay: 0 },
  { text: "Allocating resources (Nodes: 4, TaskTrackers: 16)...", delay: 800 },
  { text: "Uploading CSV file(s) to HDFS...", delay: 1500 },
  { text: "Job 1: StockVolumeMapper processing blocks...", delay: 2500 },
  { text: "Job 1: Emitting intermediate Key/Value pairs...", delay: 3500 },
  { text: "Job 1: StockVolumeReducer aggregating data...", delay: 4500 },
  { text: "Job 1: Volume & Basic Statistics COMPLETED.", delay: 5500, success: true },
  { text: "Job 2: Top10VolumeMapper sorting by Avg Volume...", delay: 6000 },
  { text: "Job 2: Top10HighestVolumeReducer selecting...", delay: 7000 },
  { text: "Job 2: Top 10 Stocks COMPLETED.", delay: 8000, success: true },
  { text: "Compiling Volatility Analysis metrics...", delay: 8500 },
  { text: "Analysis successfully written to output folders.", delay: 9500, success: true }
];

export function TerminalLoader({ isComplete }: { isComplete: boolean }) {
  const [logs, setLogs] = useState<typeof MAPREDUCE_LOGS>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    // Process logs sequentially
    MAPREDUCE_LOGS.forEach((log) => {
      const timeout = setTimeout(() => {
        setLogs(prev => [...prev, log]);
      }, log.delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full max-w-3xl mx-auto glass-panel rounded-xl overflow-hidden border border-primary/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
      <div className="bg-black/60 px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <TerminalSquare className="w-4 h-4 text-primary" />
        <span className="font-mono text-sm text-primary">hadoop@master:~/mapreduce-jobs$</span>
      </div>
      <div 
        ref={containerRef}
        className="p-6 font-mono text-sm h-64 overflow-y-auto flex flex-col gap-2"
      >
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <span className="text-muted-foreground mt-0.5">[{new Date().toISOString().split('T')[1].slice(0,8)}]</span>
              <span className="flex-1 flex items-center gap-2">
                {log.success ? (
                  <span className="text-emerald-400 font-semibold">{log.text}</span>
                ) : (
                  <span className="text-blue-100">{log.text}</span>
                )}
                {log.success && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </span>
            </motion.div>
          ))}
          {!isComplete && logs.length < MAPREDUCE_LOGS.length && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-primary mt-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="animate-pulse">Processing...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
