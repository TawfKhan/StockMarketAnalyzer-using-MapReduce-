import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, Play, FileSpreadsheet, RotateCcw, 
  BarChart3, Activity, PieChart, Database, X
} from 'lucide-react';
import { useAnalysis } from '@/hooks/use-analysis';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TerminalLoader } from '@/components/TerminalLoader';
import { StatCard } from '@/components/StatCard';
import { VolumeTable } from '@/components/VolumeTable';
import { Top10Chart } from '@/components/Top10Chart';
import { VolatilityTable } from '@/components/VolatilityTable';
import type { AnalysisResult } from '@workspace/api-client-react';

type Tab = 'volume' | 'top10' | 'volatility';

export default function Home() {
  const { toast } = useToast();
  const mutation = useAnalysis();
  
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('volume');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  
  // Simulated Processing State for the MapReduce aesthetics
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [pendingResults, setPendingResults] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show results only when BOTH the API has responded AND the animation has finished
  useEffect(() => {
    if (pendingResults && animationDone) {
      setResults(pendingResults);
      setIsSimulating(false);
    }
  }, [pendingResults, animationDone]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV files only.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunAnalysis = async () => {
    if (files.length === 0) return;
    
    setIsSimulating(true);
    setAnimationDone(false);
    setPendingResults(null);
    
    mutation.mutate(
      { data: { files } },
      {
        onSuccess: (data) => {
          // Store results — they will display once the terminal animation also completes
          setPendingResults(data);
        },
        onError: (err) => {
          toast({
            title: "Analysis Failed",
            description: err.message || "An error occurred during processing.",
            variant: "destructive"
          });
          setIsSimulating(false);
          setAnimationDone(false);
          setPendingResults(null);
        }
      }
    );
  };

  const handleReset = () => {
    setFiles([]);
    setResults(null);
    setIsSimulating(false);
    setAnimationDone(false);
    setPendingResults(null);
    setActiveTab('volume');
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
    >
      {/* Background Hero Image Map */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]" 
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/grid-bg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient mb-4">
              Stock Market Analysis
            </h1>
            <p className="text-lg text-muted-foreground font-mono bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/10">
              Distributed MapReduce Simulation
            </p>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          {!isSimulating && !results && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "glass-panel p-12 rounded-2xl border-2 border-dashed text-center transition-all duration-300",
                  isDragging ? "border-primary bg-primary/10" : "border-white/20 hover:border-primary/50 hover:bg-white/5"
                )}
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-black/40 rounded-full flex items-center justify-center border border-white/10">
                  <UploadCloud className={cn("w-10 h-10 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-2">Upload Stock Data</h3>
                <p className="text-muted-foreground mb-6">Drag and drop CSV files here, or click to browse</p>
                <p className="text-xs text-muted-foreground/50 font-mono mb-8">Expected format: Date, Open, High, Low, Close, Volume, Symbol</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept=".csv" 
                  multiple 
                  className="hidden" 
                />
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mr-4"
                >
                  Browse Files
                </Button>

                <Button 
                  onClick={handleRunAnalysis}
                  disabled={files.length === 0}
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Run Analysis
                </Button>
              </div>

              {files.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 space-y-2"
                >
                  <h4 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Selected Files ({files.length})</h4>
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        <span className="font-mono text-sm">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {isSimulating && (
            <motion.div 
              key="simulating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center py-12"
            >
              <TerminalLoader
                apiComplete={!!pendingResults}
                onAnimationDone={() => setAnimationDone(true)}
              />
            </motion.div>
          )}

          {results && !isSimulating && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Files Processed" 
                  value={results.filesProcessed} 
                  icon={<FileSpreadsheet className="w-6 h-6" />} 
                  delay={0.1}
                />
                <StatCard 
                  title="Rows Evaluated" 
                  value={new Intl.NumberFormat('en-US').format(results.rowsProcessed)} 
                  icon={<Database className="w-6 h-6" />} 
                  delay={0.2}
                />
                <StatCard 
                  title="Unique Symbols" 
                  value={results.volumeStats.length} 
                  icon={<PieChart className="w-6 h-6" />} 
                  delay={0.3}
                />
              </div>

              {/* Folder Tabs UI */}
              <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                
                {/* Tab Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4">
                  <div className="flex gap-2">
                    {[
                      { id: 'volume', label: 'Folder 1: Volume Stats', icon: Database },
                      { id: 'top10', label: 'Folder 2: Top 10 Stocks', icon: BarChart3 },
                      { id: 'volatility', label: 'Folder 3: Volatility', icon: Activity },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={cn(
                          "px-6 py-4 font-display font-medium text-sm flex items-center gap-2 border-b-2 transition-all",
                          activeTab === tab.id 
                            ? "border-primary text-primary bg-primary/5" 
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  
                  <Button variant="ghost" onClick={handleReset} className="hidden md:flex">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Session
                  </Button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'volume' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="mb-6">
                        <h2 className="text-xl font-display font-bold text-foreground">Total Trading Volume & Averages</h2>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">Aggregated via MapReduce (Sum volumes, Count days)</p>
                      </div>
                      <VolumeTable data={results.volumeStats} />
                    </motion.div>
                  )}
                  
                  {activeTab === 'top10' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="mb-6">
                        <h2 className="text-xl font-display font-bold text-foreground">Top 10 Highest Volume</h2>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">Chained Job Output: Sorted globally</p>
                      </div>
                      <Top10Chart data={results.top10} />
                    </motion.div>
                  )}
                  
                  {activeTab === 'volatility' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="mb-6">
                        <h2 className="text-xl font-display font-bold text-foreground">Volatility & Daily Return</h2>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">Range = High - Low | Return = Close - Open</p>
                      </div>
                      <VolatilityTable data={results.volatility} />
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div className="md:hidden flex justify-center mt-6">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
