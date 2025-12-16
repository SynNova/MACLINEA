import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Section({ 
  title, 
  subtitle, 
  children, 
  className = '',
  id 
}: SectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`py-8 md:py-12 ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-6 md:mb-8">
          {title && (
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-gray-400 text-base md:text-lg">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </motion.section>
  );
}

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className = '' }: SectionDividerProps) {
  return (
    <div className={`relative py-8 ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/5" />
      </div>
      <div className="relative flex justify-center">
        <div className="w-2 h-2 bg-usifix/50 rounded-full" />
      </div>
    </div>
  );
}

