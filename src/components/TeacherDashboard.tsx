import React, { useState, useEffect } from 'react';
import { UserProfile } from '../App';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp, auth, signOut, doc, deleteDoc, getDocs } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { 
  Plus, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  CheckCircle2, 
  GraduationCap, 
  LogOut, 
  User, 
  Mail, 
  Clock, 
  Calendar,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Share2,
  X,
  AlertCircle,
  ChevronRight,
  ClipboardList as ClipboardListIcon,
  FilePlus2,
  Loader2,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Menu,
  RotateCcw
} from 'lucide-react';
import Settings from './Settings';
import Sidebar from './Sidebar';
import { useToast } from './Toast';

export default function TeacherDashboard({ profile, setProfile }: { profile: UserProfile, setProfile: (p: UserProfile) => void }) {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [studentToReset, setStudentToReset] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareLink, setActiveShareLink] = useState('');
  const [activeShareTitle, setActiveShareTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    duration: 30,
    scheduledDate: '',
    scheduledTime: '',
    questions: [] as any[]
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    pairs: [{ key: '', value: '' }]
  });

  useEffect(() => {
    // Fetch students who linked to this teacher
    const qS = query(collection(db, 'users'), where('linkedTeacherId', '==', profile.uid), where('role', '==', 'student'));
    const unsubS = onSnapshot(qS, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch quizzes created by this teacher
    const qQ = query(collection(db, 'quizzes'), where('userId', '==', profile.uid));
    const unsubQ = onSnapshot(qQ, (snap) => {
      setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch all scores for this teacher's quizzes or students
    const qSc = query(collection(db, 'scores'), where('teacherId', '==', profile.uid));
    const unsubSc = onSnapshot(qSc, (snap) => {
      setAllScores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubS(); unsubQ(); unsubSc(); };
  }, [profile.uid]);

  const handleCreateQuiz = async () => {
    if (!newQuiz.title || newQuiz.questions.length === 0) return;
    setCreating(true);
    try {
      await addDoc(collection(db, 'quizzes'), {
        userId: profile.uid,
        title: newQuiz.title,
        duration: newQuiz.duration,
        scheduledDate: newQuiz.scheduledDate,
        scheduledTime: newQuiz.scheduledTime,
        questions: newQuiz.questions,
        createdAt: serverTimestamp()
      });
      setIsManualModalOpen(false);
      setNewQuiz({ title: '', duration: 30, scheduledDate: '', scheduledTime: '', questions: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question) return;
    setNewQuiz({
      ...newQuiz,
      questions: [...newQuiz.questions, { ...currentQuestion }]
    });
    setCurrentQuestion({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      pairs: [{ key: '', value: '' }]
    });
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      await deleteDoc(doc(db, 'quizzes', quizToDelete));
      setQuizToDelete(null);
      showToast('تم حذف الاختبار بنجاح');
    } catch (e) {
      console.error(e);
      showToast('فشل في حذف الاختبار', 'error');
    }
  };

  const handleResetStudent = async () => {
    if (!studentToReset) return;
    try {
      const qSc = query(
        collection(db, 'scores'), 
        where('studentId', '==', studentToReset.id),
        where('teacherId', '==', profile.uid)
      );
      const snap = await getDocs(qSc);
      const batch: any[] = [];
      snap.forEach(d => {
        batch.push(deleteDoc(doc(db, 'scores', d.id)));
      });
      await Promise.all(batch);
      setStudentToReset(null);
      setSelectedStudent(null);
      showToast('تم تصفير حالة الطالب بنجاح');
    } catch (e) {
      console.error(e);
      showToast('فشل في تصفير الحالة', 'error');
    }
  };

  const getStudentScore = (studentId: string) => {
    const studentScores = allScores.filter(s => s.studentId === studentId);
    if (studentScores.length === 0) return '---';
    const lastScore = studentScores[studentScores.length - 1];
    return `${lastScore.score}/${lastScore.total}`;
  };

  const calculateStats = () => {
    if (allScores.length === 0) return { avg: '0%', total: 0 };
    const totalPercent = allScores.reduce((acc, curr) => acc + (curr.score / curr.total), 0);
    return {
      avg: `${Math.round((totalPercent / allScores.length) * 100)}%`,
      total: allScores.length
    };
  };

  const stats = calculateStats();

  const handleExportExcel = (quizId?: string) => {
    let scoresToExport = allScores;
    let fileName = 'إحصائيات_الأداء.xlsx';

    if (quizId) {
      scoresToExport = allScores.filter(s => s.quizId === quizId);
      const quiz = quizzes.find(q => q.id === quizId);
      fileName = `تقرير_اختبار_${quiz?.title || 'مجهول'}.xlsx`;
    }

    const data = scoresToExport.map(score => {
      const student = students.find(s => s.id === score.studentId);
      return {
        'اسم الطالب': student ? student.name : 'مستخدم خارجي',
        'البريد الإلكتروني': student ? student.email : '---',
        'عنوان الاختبار': score.quizTitle,
        'الدرجة': score.score,
        'الإجمالي': score.total,
        'النسبة المئوية': `${Math.round((score.score / score.total) * 100)}%`,
        'تاريخ الإنجاز': score.completedAt?.seconds 
          ? new Date(score.completedAt.seconds * 1000).toLocaleString('ar-EG') 
          : '---'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'النتائج');
    XLSX.writeFile(workbook, fileName);
  };

  if (activeSection === 'settings') {
    return (
      <div className="flex bg-slate-50 min-h-screen" dir="rtl">
        <Sidebar 
          activeSection="settings" 
          setActiveSection={setActiveSection} 
          role="teacher" 
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
      case 'students':
        return (
          <div className="space-y-6 text-right">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4">قائمة الطلاب</h2>
              <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="ابحث عن طالب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none w-64 font-medium"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students
                .filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-right hover:border-indigo-600 transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <User className="w-8 h-8" />
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-black text-right">
                      {getStudentScore(student.id)}
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">{student.name}</h3>
                  <p className="text-slate-500 font-medium flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4" />
                    {student.email}
                  </p>
                </button>
              ))}
              {students.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">لا يوجد طلاب مرتبطين بك حالياً.</div>}
            </div>
          </div>
        );
      case 'analytics':
        const quizPerformanceData = quizzes.map(q => {
          const quizScores = allScores.filter(s => s.quizId === q.id);
          const avg = quizScores.length > 0 
            ? quizScores.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / quizScores.length 
            : 0;
          return {
            name: q.title.length > 15 ? q.title.substring(0, 15) + '...' : q.title,
            fullTitle: q.title,
            average: Math.round(avg * 100),
            count: quizScores.length
          };
        });

        const performanceDistribution = [
          { name: 'ممتاز (90%+)', value: allScores.filter(s => (s.score/s.total) >= 0.9).length, color: '#10b981' },
          { name: 'جيد جداً (75-89%)', value: allScores.filter(s => (s.score/s.total) >= 0.75 && (s.score/s.total) < 0.9).length, color: '#3b82f6' },
          { name: 'جيد (60-74%)', value: allScores.filter(s => (s.score/s.total) >= 0.6 && (s.score/s.total) < 0.75).length, color: '#f59e0b' },
          { name: 'ضعيف (تحت 60%)', value: allScores.filter(s => (s.score/s.total) < 0.6).length, color: '#ef4444' },
        ].filter(d => d.value > 0);

        return (
          <div className="space-y-10 text-right">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4">تقارير وتحليلات الأداء</h2>
              <button 
                onClick={() => handleExportExcel()}
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
              >
                <Download className="w-5 h-5" />
                تصدير كافة البيانات (Excel)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Performance Chart */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                  متوسط الأداء لكل اختبار (%)
                </h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quizPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0} 
                        height={60} 
                        stroke="#94a3b8" 
                        fontSize={12}
                        fontFamily="Inter"
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} fontFamily="Inter" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Inter', direction: 'rtl', textAlign: 'right' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="average" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                  <PieChartIcon className="w-6 h-6 text-emerald-600" />
                  توزيع مستويات الطلاب
                </h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={performanceDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {performanceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Inter', direction: 'rtl', textAlign: 'right' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">تقارير الاختبارات التفصيلية</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-right">
                   <thead className="bg-slate-50 border-b border-slate-100">
                     <tr>
                       <th className="px-8 py-5 text-sm font-black text-slate-400">اسم الاختبار</th>
                       <th className="px-8 py-5 text-sm font-black text-slate-400">عدد المجتازين</th>
                       <th className="px-8 py-5 text-sm font-black text-slate-400">متوسط الدرجة</th>
                       <th className="px-8 py-5 text-sm font-black text-slate-400">الإجراء</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {quizzes.map(quiz => {
                       const quizScores = allScores.filter(s => s.quizId === quiz.id);
                       const avg = quizScores.length > 0 
                         ? quizScores.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / quizScores.length 
                         : 0;
                       return (
                         <tr key={quiz.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-6 font-bold text-slate-900">{quiz.title}</td>
                           <td className="px-8 py-6 font-bold text-slate-600">{quizScores.length} طالب</td>
                           <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                               <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                                 <div className="bg-indigo-600 h-full" style={{ width: `${avg * 100}%` }} />
                               </div>
                               <span className="text-xs font-black">{Math.round(avg * 100)}%</span>
                             </div>
                           </td>
                           <td className="px-8 py-6">
                             <button 
                               onClick={() => handleExportExcel(quiz.id)}
                               className="text-emerald-600 font-bold hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                             >
                               <Download className="w-4 h-4" />
                               تحميل التقرير
                             </button>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        );
      case 'quizzes':
        return (
          <div className="space-y-6 text-right">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4">اختباراتك</h2>
              <button 
                onClick={() => setIsManualModalOpen(true)}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                <Plus className="w-6 h-6" />
                إنشاء اختبار يدوي
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col group text-right">
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      onClick={() => setSelectedQuiz(quiz)}
                      className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer"
                    >
                      <ClipboardListIcon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setQuizToDelete(quiz.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/quiz/${quiz.id}`;
                          setActiveShareLink(url);
                          setActiveShareTitle(quiz.title);
                          setIsShareModalOpen(true);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <h3 
                    onClick={() => setSelectedQuiz(quiz)}
                    className="text-lg font-black text-slate-900 mb-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    {quiz.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-400 mt-auto pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      {quiz.questions.length} سؤال
                    </div>
                    {quiz.duration && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {quiz.duration} دقيقة
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {quizzes.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 font-bold italic">لا توجد اختبارات منشورة بعد.</div>}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-12 text-right">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <StatCard icon={<Users />} label="إجمالي الطلاب" value={students.length} color="indigo" />
              <StatCard icon={<ClipboardListIcon />} label="الاختبارات النشطة" value={quizzes.length} color="emerald" />
              <StatCard icon={<TrendingUp />} label="متوسط الأداء" value={stats.avg} color="amber" />
              <StatCard icon={<CheckCircle2 />} label="اختبارات منجزة" value={stats.total} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="flex justify-between items-center text-right">
                  <h2 className="text-2xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4 tracking-tight">نظرة عامة على الطلاب</h2>
                  <button 
                    onClick={() => setActiveSection('students')}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-right">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">الطالب</th>
                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">آخر درجة</th>
                        <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.slice(0, 5).map(student => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                                {student.name[0]}
                              </div>
                              <div className="font-bold text-slate-900">{student.name}</div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black">
                              {getStudentScore(student.id)}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <button 
                              onClick={() => setSelectedStudent(student)}
                              className="text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                            >
                              تفاصيل
                            </button>
                          </td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr>
                           <td colSpan={3} className="px-8 py-12 text-center text-slate-400 italic font-bold">لا يوجد طلاب بعد</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-8 text-right">
                <h2 className="text-2xl font-black text-slate-900 underline decoration-amber-200 decoration-8 underline-offset-4 tracking-tight">تنبيهات الأداء</h2>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="space-y-4">
                    {allScores
                      .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
                      .slice(0, 10)
                      .map((score, idx) => {
                        const isLinked = students.find(s => s.id === score.studentId);
                        return (
                          <div key={idx} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100">
                            <div className={`w-2 h-12 rounded-full shrink-0 ${score.score / score.total > 0.7 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{score.quizTitle}</div>
                              <div className="text-xs text-slate-500 font-black">
                                {isLinked ? isLinked.name : 'مستخدم خارجي'} • {Math.round((score.score/score.total)*100)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {allScores.length === 0 && <div className="text-center py-10 text-slate-400 italic">لا توجد نتائج حالياً</div>}
                  </div>
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
        role="teacher" 
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
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="text-right">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900">
                {activeSection === 'dashboard' ? 'نظرة عامة' :
                 activeSection === 'students' ? 'إدارة الطلاب' :
                 activeSection === 'quizzes' ? 'إدارة الاختبارات' : 
                 activeSection === 'analytics' ? 'التقارير والإحصائيات' : 'الإعدادات'}
              </h1>
              <p className="text-sm md:text-base text-slate-500 font-medium tracking-tight">أهلاً بك، د. {profile.name} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-slate-200 cursor-pointer hover:bg-slate-800 transition-all flex-1 md:flex-none justify-center" onClick={() => {
                navigator.clipboard.writeText(profile.teacherCode || '');
                showToast('تم نسخ كود المعلم');
             }}>
                <span className="text-[10px] opacity-60 uppercase tracking-widest">كود المعلم:</span>
                <span className="tracking-widest font-mono text-emerald-400">{profile.teacherCode}</span>
             </div>
          </div>
        </header>

        {renderContent()}

        {/* Share Modal */}
        <AnimatePresence>
          {isShareModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl text-right"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">مشاركة الاختبار</h3>
                  <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">اسم الاختبار</label>
                  <div className="text-lg font-bold text-slate-900">{activeShareTitle}</div>
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">رابط المشاركة</label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm font-mono break-all line-clamp-2">
                      {activeShareLink}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(activeShareLink);
                      showToast('تم نسخ رابط الاختبار');
                    }}
                    className="bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <ClipboardListIcon className="w-5 h-5" />
                    نسخ الرابط
                  </button>
                  <button 
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: activeShareTitle,
                            text: `شارك في اختبار: ${activeShareTitle}`,
                            url: activeShareLink,
                          });
                        } catch (e: any) {
                          if (e.name !== 'AbortError') {
                            window.open(activeShareLink, '_blank');
                          }
                        }
                      } else {
                        window.open(activeShareLink, '_blank');
                      }
                    }}
                    className="bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    {navigator.share ? <Share2 className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    {navigator.share ? 'مشاركة عبر...' : 'فتح المعاينة'}
                  </button>
                </div>

                {window.location.origin.includes('ais-dev-') && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 leading-relaxed text-right">
                      هذا رابط "مشاركة عام" (ais-pre). لكي يعمل الرابط مع الطلاب، تأكد من الضغط على زر <b>Share</b> في أعلى شاشة المطور لنشر التطبيق أولاً.
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Manual Modal */}
        <AnimatePresence>
          {isManualModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !creating && setIsManualModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] text-right"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-xl font-bold">إنشاء اختبار يدوي</h2>
                  <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">عنوان الاختبار</label>
                      <input 
                        type="text" 
                        value={newQuiz.title}
                        onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                        placeholder="مثال: اختبار الشهر - مادة الفيزياء"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-right font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الاختبار (اختياري)</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <input 
                          type="date" 
                          value={newQuiz.scheduledDate}
                          onChange={(e) => setNewQuiz({ ...newQuiz, scheduledDate: e.target.value })}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none pr-4 text-right"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">وقت الاختبار (اختياري)</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                        <input 
                          type="time" 
                          value={newQuiz.scheduledTime}
                          onChange={(e) => setNewQuiz({ ...newQuiz, scheduledTime: e.target.value })}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none pr-4 text-right"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">مدة الاختبار (بالدقائق)</label>
                      <input 
                        type="number" 
                        value={newQuiz.duration}
                        onChange={(e) => setNewQuiz({ ...newQuiz, duration: Number(e.target.value) })}
                        min="1"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-right font-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold border-b pb-2">إضافة سؤال جديد</h3>
                    
                    <div className="flex gap-2">
                      {['mcq', 'boolean', 'completion', 'matching'].map((t) => (
                        <button 
                          key={t}
                          onClick={() => setCurrentQuestion({ ...currentQuestion, type: t })}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            currentQuestion.type === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {t === 'mcq' ? 'اختياري' : t === 'boolean' ? 'صح/خطأ' : t === 'completion' ? 'أكمل' : 'توصيل'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4 bg-slate-50 p-6 rounded-2xl">
                      <textarea 
                        placeholder="نص السؤال..."
                        value={currentQuestion.question}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                        className="w-full p-4 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-right"
                      />

                      {currentQuestion.type === 'mcq' && (
                        <div className="grid grid-cols-2 gap-4">
                          {currentQuestion.options.map((opt, i) => (
                            <input 
                              key={i}
                              value={opt}
                              onChange={(e) => {
                                const opts = [...currentQuestion.options];
                                opts[i] = e.target.value;
                                setCurrentQuestion({ ...currentQuestion, options: opts });
                              }}
                              placeholder={`خيار ${i + 1}`}
                              className="p-3 border rounded-xl text-sm text-right font-medium"
                            />
                          ))}
                          <input 
                            placeholder="الإجابة الصحيحة (يجب أن تطابق أحد الخيارات)"
                            value={currentQuestion.correctAnswer}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                            className="col-span-2 p-3 border-2 border-emerald-100 rounded-xl text-sm text-right font-bold"
                          />
                        </div>
                      )}

                      {currentQuestion.type === 'boolean' && (
                        <div className="flex gap-4">
                          {['صح', 'خطأ'].map(v => (
                            <button 
                              key={v}
                              onClick={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: v, options: ['صح', 'خطأ'] })}
                              className={`flex-1 py-3 rounded-xl border-2 font-black ${currentQuestion.correctAnswer === v ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-100' : 'bg-white text-slate-400'}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}

                      {currentQuestion.type === 'completion' && (
                        <input 
                          placeholder="الإجابة الصحيحة..."
                          value={currentQuestion.correctAnswer}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                          className="w-full p-4 border rounded-xl text-right font-bold"
                        />
                      )}

                      {currentQuestion.type === 'matching' && (
                        <div className="space-y-3">
                          {currentQuestion.pairs.map((p, i) => (
                            <div key={i} className="flex gap-2">
                              <input 
                                placeholder="الكلمة أ" 
                                value={p.key}
                                onChange={(e) => {
                                  const ps = [...currentQuestion.pairs];
                                  ps[i].key = e.target.value;
                                  setCurrentQuestion({ ...currentQuestion, pairs: ps });
                                }}
                                className="flex-1 p-3 border rounded-xl text-right"
                              />
                              <input 
                                placeholder="الكلمة ب" 
                                value={p.value}
                                onChange={(e) => {
                                  const ps = [...currentQuestion.pairs];
                                  ps[i].value = e.target.value;
                                  setCurrentQuestion({ ...currentQuestion, pairs: ps });
                                }}
                                className="flex-1 p-3 border rounded-xl text-right"
                              />
                            </div>
                          ))}
                          <button 
                            onClick={() => setCurrentQuestion({ ...currentQuestion, pairs: [...currentQuestion.pairs, { key: '', value: '' }] })}
                            className="text-indigo-600 font-black text-sm hover:underline"
                          >
                            + إضافة زوج آخر
                          </button>
                        </div>
                      )}

                      <button 
                        onClick={handleAddQuestion}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                      >
                        <Plus className="w-5 h-5" />
                        إضافة السؤال للاختبار
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold">الأسئلة المضافة ({newQuiz.questions.length})</h3>
                    <div className="space-y-2">
                      {newQuiz.questions.map((q, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 group">
                          <div className="flex items-center gap-3 flex-1 overflow-hidden">
                             <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</span>
                             <div className="text-xs font-bold truncate text-slate-600">{q.question}</div>
                          </div>
                          <button 
                            onClick={() => {
                              const qs = [...newQuiz.questions];
                              qs.splice(i, 1);
                              setNewQuiz({ ...newQuiz, questions: qs });
                            }}
                            className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {newQuiz.questions.length === 0 && <div className="text-center py-6 text-slate-400 italic text-sm">لم يتم إضافة أسئلة بعد</div>}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t bg-slate-50 flex gap-4">
                  <button 
                    onClick={() => setIsManualModalOpen(false)}
                    className="flex-1 py-4 font-black text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={handleCreateQuiz}
                    disabled={creating || !newQuiz.title || newQuiz.questions.length === 0}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-emerald-100"
                  >
                    {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'حفظ ونشر الاختبار'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {quizToDelete && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">حذف الاختبار؟</h3>
                <p className="text-slate-500 mb-8">هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع نتائج الطلاب المرتبطة به.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setQuizToDelete(null)}
                    className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={handleDeleteQuiz}
                    className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-bold hover:bg-rose-700 transition-all"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {studentToReset && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">تصفير حالة الطالب؟</h3>
                <p className="text-slate-500 mb-8">سيتم حذف جميع درجات الطالب {studentToReset.name} بشكل نهائي. هل تريد الاستمرار؟</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStudentToReset(null)}
                    className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={handleResetStudent}
                    className="flex-1 bg-rose-600 text-white py-4 rounded-xl font-bold hover:bg-rose-700 transition-all"
                  >
                    تأكيد التصفير
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quiz Preview Modal */}
        <AnimatePresence>
          {selectedQuiz && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] text-right"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                   <button onClick={() => setSelectedQuiz(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedQuiz.title}</h2>
                    <p className="text-slate-500 font-medium">معاينة محتوى الاختبار</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl text-center">
                         <div className="text-xl font-black text-slate-900">{selectedQuiz.questions.length}</div>
                         <div className="text-[10px] text-slate-400 font-black uppercase">عدد الأسئلة</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl text-center">
                         <div className="text-xl font-black text-slate-900">{selectedQuiz.duration}</div>
                         <div className="text-[10px] text-slate-400 font-black uppercase">مدة الاختبار (دقية)</div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h3 className="text-lg font-black text-slate-900">أسئلة الاختبار:</h3>
                      {selectedQuiz.questions.map((q: any, i: number) => (
                        <div key={i} className="p-6 border border-slate-100 rounded-3xl bg-slate-50/50">
                           <div className="flex items-center gap-2 mb-3">
                              <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-black">س{i+1}</span>
                              <span className="text-[10px] text-slate-400 font-black bg-white px-2 py-0.5 rounded border border-slate-200">
                                {q.type === 'mcq' ? 'اختياري' : q.type === 'boolean' ? 'صح/خطأ' : q.type === 'completion' ? 'أكمل' : 'توصيل'}
                              </span>
                           </div>
                           <p className="font-bold text-slate-800 mb-4">{q.question}</p>
                           {q.type === 'mcq' && (
                             <div className="grid grid-cols-2 gap-2 text-xs">
                               {q.options.map((opt: string, j: number) => (
                                 <div key={j} className={`p-2 rounded-lg border ${opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100'}`}>
                                   {opt}
                                 </div>
                               ))}
                             </div>
                           )}
                           {q.type === 'boolean' && (
                             <div className="text-sm font-bold text-emerald-600">الإجابة: {q.correctAnswer}</div>
                           )}
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Student Analytics Modal */}
        <AnimatePresence>
          {selectedStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedStudent(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto text-right"
              >
                <div className="flex justify-between items-center mb-10">
                   <div className="flex gap-2 order-first">
                      <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                      </button>
                      <button 
                        onClick={() => setStudentToReset(selectedStudent)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                        title="تصفير حالة الطالب"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                   </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedStudent.name}</h2>
                      <div className="flex items-center gap-2 justify-end text-slate-500 font-medium">
                        <Mail className="w-4 h-4" />
                        <span>{selectedStudent.email}</span>
                      </div>
                    </div>
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center shadow-inner">
                      <User className="w-10 h-10" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-12">
                  <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 text-center">
                    <div className="text-4xl font-black text-slate-900 mb-2">
                       {allScores.filter(s => s.studentId === selectedStudent.id).length}
                    </div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">إجمالي الاختبارات</div>
                  </div>
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 text-center">
                    <div className="text-4xl font-black text-emerald-600 mb-2">
                      {(() => {
                        const sScores = allScores.filter(s => s.studentId === selectedStudent.id);
                        if (sScores.length === 0) return '0%';
                        const tot = sScores.reduce((a, c) => a + (c.score / c.total), 0);
                        return `${Math.round((tot / sScores.length) * 100)}%`;
                      })()}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">متوسط التحصيل</div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-xl font-black text-slate-900 underline decoration-indigo-200 decoration-8 underline-offset-4 tracking-tight">سجل الدرجات</h3>
                  <div className="space-y-3">
                    {allScores
                      .filter(s => s.studentId === selectedStudent.id)
                      .sort((a, b) => (b.completedAt?.seconds || 0) - (a.seconds || 0))
                      .map((sc, i) => (
                        <div key={i} className="p-5 border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                           <div className="flex items-center gap-6">
                             <div className={`px-4 py-2 rounded-2xl font-black text-sm ${sc.score / sc.total >= 0.7 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {Math.round((sc.score/sc.total)*100)}%
                             </div>
                             <div className="text-lg font-mono font-black text-slate-700 tracking-tighter">{sc.score}/{sc.total}</div>
                           </div>
                           <div className="text-right">
                             <div className="font-bold text-slate-900 mb-1">{sc.quizTitle}</div>
                             <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
                                {sc.completedAt?.seconds ? new Date(sc.completedAt.seconds * 1000).toLocaleDateString('ar-EG') : 'تاريخ غير متوفر'}
                             </div>
                           </div>
                        </div>
                      ))}
                    {allScores.filter(s => s.studentId === selectedStudent.id).length === 0 && (
                      <div className="text-center py-10 text-slate-400 font-bold italic opacity-60">لا توجد بيانات متاحة لهذا الطالب</div>
                    )}
                  </div>
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
    indigo: 'bg-indigo-50/50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50/50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50/50 text-rose-600 border-rose-100',
  };

  return (
    <div className={`bg-white p-8 rounded-[2rem] border-2 ${colors[color]} border-opacity-40 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon, { className: 'w-7 h-7' })}
      </div>
      <div className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">{value}</div>
      <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}
