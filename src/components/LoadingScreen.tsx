import React from 'react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-[10000]">
      <div className="flex flex-col items-center w-full max-w-[300px]">
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
          className="text-[clamp(2rem,8vw,3rem)] font-extrabold tracking-[-0.04em] mb-8 uppercase text-white"
        >
          BS STOCKS
        </motion.div>
        
        <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
        
        <div className="mt-8 text-sm font-medium tracking-wider text-white/80">
          BS Stocks Loading . . .
        </div>
      </div>
    </div>
  );
}
