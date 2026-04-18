import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc } from '../firebase';
import { motion } from 'motion/react';
import { useToast } from './Toast';
import { ChevronLeft, BookOpen, Clock, Share2, Printer, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function SummaryView() {
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, 'summaries', id));
      if (docSnap.exists()) {
        setSummary(docSnap.data());
      }
      setLoading(false);
    };
    fetchSummary();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!summary) return <div>غير موجود</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        العودة للرئيسية
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="p-8 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 text-indigo-600 mb-4">
            <BookOpen className="w-6 h-6" />
            <span className="font-bold text-sm uppercase tracking-widest">ملخص تعليمي</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-6">{summary.title}</h1>
          <div className="flex flex-wrap gap-6 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {new Date(summary.createdAt?.seconds * 1000).toLocaleDateString('ar-EG')}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              تم التلخيص بواسطة AI
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 prose prose-indigo max-w-none">
          <div className="markdown-body text-lg leading-relaxed text-slate-700">
            <ReactMarkdown>{summary.summaryContent}</ReactMarkdown>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-4">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('تم نسخ رابط الملخص');
              }}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => window.print()}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            تمت المراجعة
          </button>
        </div>
      </motion.div>
    </div>
  );
}
