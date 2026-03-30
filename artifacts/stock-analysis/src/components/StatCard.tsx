import React from 'react';
import { Card, CardContent } from './ui/card';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  delay?: number;
}

export function StatCard({ title, value, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
              <h4 className="text-3xl font-display font-bold text-foreground">
                {value}
              </h4>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl ring-1 ring-primary/25 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
