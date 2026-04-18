import React, { useState } from 'react';
import { auth, signInWithPopup, googleProvider, db, doc, setDoc, getDoc } from '../firebase';
import { motion } from 'motion/react';
import { GraduationCap, LogIn } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-12"
      >
        <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-xl inline-block mb-6">
          <GraduationCap className="w-20 h-20" />
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tight">EduAI</h1>
        <p className="text-indigo-100 text-xl max-w-sm mx-auto leading-relaxed">
          مستقبلك التعليمي يبدأ هنا مع قوة الذكاء الاصطناعي
        </p>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogin}
        disabled={loading}
        className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center gap-3 hover:bg-indigo-50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <LogIn className="w-6 h-6" />
        )}
        تسجيل الدخول باستخدام جوجل
      </motion.button>

      <div className="mt-12 grid grid-cols-3 gap-8 text-center opacity-80 max-w-2xl">
        <div>
          <div className="font-bold text-2xl">100%</div>
          <div className="text-xs uppercase tracking-wider">دقة التلخيص</div>
        </div>
        <div>
          <div className="font-bold text-2xl">AI</div>
          <div className="text-xs uppercase tracking-wider">مدعوم بالذكاء</div>
        </div>
        <div>
          <div className="font-bold text-2xl">FREE</div>
          <div className="text-xs uppercase tracking-wider">مجاني للطلاب</div>
        </div>
      </div>
    </div>
  );
}
