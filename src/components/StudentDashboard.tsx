import React, { useState, useEffect } from 'react';
import { UserProfile } from '../App';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp, auth, signOut, doc, updateDoc, getDocs } from '../firebase';
import { generateSummary, generateQuiz } from '../gemini';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  BrainCircuit, 
  LogOut, 
  Search,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  Link as LinkIcon,
  UserCheck,
  FileUp,
  User,
  ChevronRight,
  Menu,
  GraduationCap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Settings from './Settings';
import Sidebar from './Sidebar';
import { useToast } from './Toast';

// Load pdfjs-dist worker
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function StudentDashboard({ profile, setProfile }: { profile: UserProfile, setProfile: (p: UserProfile) => void }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [teacherCode, setTeacherCode] = useState('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    const qS = query(collection(db, 'summaries'), where('userId', '==', profile.uid));
    const unsubS = onSnapshot(qS, (snap) => {
      setSummaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qQ = query(collection(db, 'quizzes'), where('userId', '==', profile.uid));
    const unsubQ = onSnapshot(qQ, (snap) => {
      setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qSc = query(collection(db, 'scores'), where('studentId', '==', profile.uid));
    const unsubSc = onSnapshot(qSc, (snap) => {
      setScores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubS(); unsubQ(); unsubSc(); };
  }, [profile.uid]);

  const handleLinkTeacher = async () => {
    if (!teacherCode.trim()) return;
    setLinking(true);
    try {
      const cleanCode = teacherCode.trim().toUpperCase();
      const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('teacherCode', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const teacherDoc = snap.docs[0];
        const prevLinkedTeacherIds = profile.linkedTeacherIds || [];
        if (!prevLinkedTeacherIds.includes(teacherDoc.id)) {
            await updateDoc(doc(db, 'users', profile.uid), {
             linkedTeacherId: teacherDoc.id, // For backwards compatibility
             linkedTeacherIds: [...prevLinkedTeacherIds, teacherDoc.id]
            });
            showToast('تم الربط بالمعلم بنجاح');
            setProfile({...profile, linkedTeacherId: teacherDoc.id, linkedTeacherIds: [...prevLinkedTeacherIds, teacherDoc.id ]})
        } else {
             showToast('أنت مرتبط بهذا المعلم بالفعل');
        }
        setIsLinkModalOpen(false);
      } else {
        showToast('كود المعلم غير صحيح', 'error');
      }
    } catch (error) {
      console.error("Linking failed", error);
      showToast('خطأ في عملية الربط', 'error');
    } finally {
      setLinking(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('يرجى اختيار ملف PDF فقط');
      return;
    }

    setSelectedFile(file);
    setExtracting(true);
    try {
      const text = await extractTextFromPDF(file);
      setContent(text);
      if (!title) setTitle(file.name.replace('.pdf', ''));
    } catch (error) {
      console.error("PDF Extraction failed", error);
      alert('فشل في استخراج النص من الملف');
    } finally {
      setExtracting(false);
    }
  };

  const handleProcess = async () => {
    if (!content || !title) return;
    setProcessing(true);
    try {
      const summaryText = await generateSummary(content);
      const quizData = await generateQuiz(content);

      const summaryRef = await addDoc(collection(db, 'summaries'), {
        userId: profile.uid,
        title,
        originalContent: content,
        summaryContent: summaryText,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'quizzes'), {
        userId: profile.uid,
        title: `اختبار: ${title}`,
        summaryId: summaryRef.id,
        questions: quizData,
        createdAt: serverTimestamp()
      });

      showToast('تم إنشاء الملخص والاختبار بنجاح');
      setIsModalOpen(false);
      setContent('');
      setTitle('');
    } catch (error) {
      console.error("Processing failed", error);
      showToast('فشل في معالجة الملف', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (activeSection === 'settings') {
    return (
      <div className="flex bg-slate-50 min-h-screen" dir="rtl">
        <Sidebar 
          activeSection="settings" 
          setActiveSection={setActiveSection} 
          role="student" 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 lg:pr-72 p-4 md:p-8 w-full transition-all">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-3 bg-white border border-slate-100 rounded-2xl text-slate-600 shadow-sm"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black text-slate-900">الإعدادات</h1>
          </div>
          <Settings profile={profile} setProfile={setProfile} onClose={() => setActiveSection('dashboard')} />
        </main>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'summaries':
        return (
          <div className="space-y-6 text-right">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4 tracking-tight">ملخصاتك الذكية</h2>
               <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
              >
                <Plus className="w-6 h-6" />
                ملخص جديد
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summaries.map((summary) => (
                <div key={summary.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{summary.title}</h3>
                  <div className="line-clamp-3 text-slate-500 text-sm mb-6 leading-relaxed">
                    {summary.summaryContent.substring(0, 150)}...
                  </div>
                  <button 
                    onClick={() => navigate(`/summary/${summary.id}`)}
                    className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    عرض التفاصيل
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {summaries.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <FileText className="w-8 h-8" />
                   </div>
                   <p className="text-slate-400 font-bold">لا توجد ملخصات بعد. ابدأ برفع ملف PDF!</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'quizzes':
        return (
          <div className="space-y-6 text-right">
             <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-slate-900 underline decoration-emerald-200 decoration-8 underline-offset-4 tracking-tight">اختباراتك</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...quizzes, ...scores.filter(s => s.teacherId)].map((quiz, i) => {
                const isExternal = !!quiz.teacherId;
                const score = scores.find(s => s.quizId === quiz.id || (isExternal && s.id === quiz.id));
                
                return (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-6">
                       <div className={`w-12 h-12 ${isExternal ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <BrainCircuit className="w-6 h-6" />
                      </div>
                      {score && (
                        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black">
                           تم الحل: {Math.round((score.score / score.total) * 100)}%
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{quiz.title || quiz.quizTitle}</h3>
                    <div className="text-slate-500 text-sm mb-6 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {isExternal ? `اختبار الأستاذ` : `${quiz.questions?.length || 0} أسئلة`}
                    </div>
                    <button 
                      onClick={() => navigate(`/quiz/${quiz.id || quiz.quizId}`)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      {score ? 'مراجعة الأداء' : 'بدء الاختبار'}
                    </button>
                  </div>
                );
              })}
              {quizzes.length === 0 && scores.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <BrainCircuit className="w-8 h-8" />
                   </div>
                   <p className="text-slate-400 font-bold">لا توجد اختبارات متاحة الان.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'teachers':
          return (
             <div className="space-y-6 text-right">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4 tracking-tight">المعلمون</h2>
                  <button 
                    onClick={() => setIsLinkModalOpen(true)}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                  >
                    <Plus className="w-6 h-6" />
                    ربط معلم جديد
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {profile.linkedTeacherIds && profile.linkedTeacherIds.map((tid, i) => (
                      <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                           <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                              <Users className="w-7 h-7" />
                           </div>
                           <div>
                              <div className="font-bold text-slate-900">معلم مرتبط</div>
                              <div className="text-xs text-slate-400 font-mono mt-1">ID: {tid.substring(0, 8)}...</div>
                           </div>
                      </div>
                   ))}
                   {(!profile.linkedTeacherIds || profile.linkedTeacherIds.length === 0) && (
                       <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                          <Users className="w-8 h-8" />
                         </div>
                         <p className="text-slate-400 font-bold">لست مرتبطاً بأي معلم حالياً. ادخل كود المعلم للربط.</p>
                      </div>
                   )}
                </div>
             </div>
          );
      case 'subjects':
          return (
             <div className="space-y-6 text-right">
                 <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 underline decoration-amber-200 decoration-8 underline-offset-4 tracking-tight">المواد الدراسية</h2>
                 </div>
                 <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                     <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 font-bold">لا توجد مواد دراسية مضافة حتى الآن.</p>
                 </div>
             </div>
          );
      default:
        return (
          <div className="space-y-12 text-right">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={<FileText />} label="الملخصات" value={summaries.length} color="indigo" />
              <StatCard icon={<BrainCircuit />} label="الاختبارات" value={quizzes.length} color="emerald" />
              <StatCard icon={<CheckCircle2 />} label="اختبارات منجزة" value={scores.length} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-xl font-black text-slate-900">أحدث الملخصات</h2>
                   <button onClick={() => setActiveSection('summaries')} className="text-indigo-600 text-sm font-bold">عرض الكل</button>
                </div>
                <div className="space-y-4">
                  {summaries.slice(0, 3).map(s => (
                    <div key={s.id} onClick={() => navigate(`/summary/${s.id}`)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-4 hover:border-indigo-600 cursor-pointer transition-all">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <div className="font-bold text-slate-900 truncate">{s.title}</div>
                         <div className="text-xs text-slate-400 font-medium">تم الإنشاء مؤخراً</div>
                       </div>
                    </div>
                  ))}
                  {summaries.length === 0 && <div className="text-center py-10 text-slate-400 italic font-bold">لا يوجد ملخصات بعد</div>}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-xl font-black text-slate-900">آخر النتائج</h2>
                   <button onClick={() => setActiveSection('quizzes')} className="text-indigo-600 text-sm font-bold">عرض الكل</button>
                </div>
                <div className="space-y-4">
                   {scores.slice(0, 3).map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between hover:border-emerald-600 transition-all">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 font-black">
                           {Math.round((s.score/s.total)*100)}%
                         </div>
                         <div className="text-right">
                           <div className="font-bold text-slate-900 truncate max-w-[150px]">{s.quizTitle}</div>
                           <div className="text-xs text-slate-400 font-mono">{s.score}/{s.total}</div>
                         </div>
                       </div>
                       <button onClick={() => navigate(`/quiz/${s.quizId || s.id}`)} className="text-slate-400 hover:text-emerald-600 p-2">
                          <ChevronRight className="w-5 h-5 rotate-180" />
                       </button>
                    </div>
                   ))}
                   {scores.length === 0 && <div className="text-center py-10 text-slate-400 italic font-bold">لم تقم بأي اختبارات بعد</div>}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen" dir="rtl">
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        role="student" 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 lg:pr-72 p-4 md:p-8 w-full max-w-[100vw] overflow-x-hidden transition-all">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4 text-right w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-3 bg-white border border-slate-100 rounded-2xl text-slate-600 shadow-sm"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="text-right">
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                 {activeSection === 'dashboard' ? 'لوحة التحكم' : 
                  activeSection === 'summaries' ? 'الملخصات' : 
                  activeSection === 'quizzes' ? 'الاختبارات' : 
                  activeSection === 'teachers' ? 'المعلمون' :
                  'الإعدادات'}
              </h1>
              <div className="flex items-center gap-2 mt-1 justify-end">
                {profile.linkedTeacherIds && profile.linkedTeacherIds.length > 0 ? (
                  <div className="flex items-center gap-1 text-emerald-600 text-[10px] md:text-xs font-black tracking-tight" onClick={() => setIsLinkModalOpen(true)}>
                    <UserCheck className="w-3.5 h-3.5" />
                    مرتبط بـ {profile.linkedTeacherIds.length} معلم
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsLinkModalOpen(true)}
                    className="flex items-center gap-1 text-indigo-600 text-[10px] md:text-xs font-black hover:underline"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    اربط حسابك بمعلم
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
             <div className="text-right">
                <p className="text-slate-500 font-bold text-sm">مرحباً، {profile.name} 👋</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">طالب ذكي</p>
             </div>
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <User className="w-6 h-6" />
             </div>
          </div>
        </header>

        {renderContent()}

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.9, opacity: 0 }}
                 className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl text-right"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900">ملخص جديد</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">عنوان المحتوى</label>
                     <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: الوحدة الأولى في التاريخ"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-right font-medium"
                    />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">ارفع ملف PDF او انسخ النص</label>
                     <div className="grid grid-cols-1 gap-4">
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center group-hover:border-indigo-600 transition-all bg-slate-50/50">
                             <FileUp className="w-10 h-10 text-slate-400 mx-auto mb-4 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                             <p className="font-bold text-slate-900 mb-1">
                                {selectedFile ? selectedFile.name : 'اختر ملف PDF'}
                             </p>
                             <p className="text-xs text-slate-400 uppercase font-black">pdf فقط</p>
                          </div>
                          {extracting && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-20">
                               <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                               <p className="text-xs font-black text-indigo-600">جاري استخراج النص...</p>
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <textarea 
                            placeholder="أو الصق النص هنا مباشرة..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-48 focus:ring-2 focus:ring-indigo-500 outline-none text-right font-medium resize-none"
                          />
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={handleProcess}
                    disabled={processing || !content || !title}
                    className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        جاري التحليل والتحويل...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-6 h-6" />
                        ابدأ التعلم الآن
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLinkModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2rem] p-10 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LinkIcon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">ربط حساب المعلم</h3>
                <p className="text-slate-500 font-medium mb-8">أدخل الكود الذي المكون من 6 أرقام والمقدم من معلمك.</p>
                
                <input 
                  type="text" 
                  maxLength={6}
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black tracking-widest placeholder:tracking-normal placeholder:font-bold focus:border-indigo-600 outline-none transition-all mb-6 uppercase"
                />

                <div className="flex gap-4">
                   <button 
                    onClick={() => setIsLinkModalOpen(false)}
                    className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={handleLinkTeacher}
                    disabled={linking || teacherCode.length < 3}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {linking ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'تأكيد الربط'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <div className={`bg-white p-8 rounded-[2rem] border-2 ${colors[color]} border-opacity-40 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { className: 'w-7 h-7' })}
      </div>
      <div className="text-4xl font-black text-slate-900 mb-1 tracking-tighter text-right">{value}</div>
      <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-right">{label}</div>
    </div>
  );
}
