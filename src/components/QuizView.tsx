import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, addDoc, collection, serverTimestamp, auth, query, where, getDocs, updateDoc } from '../firebase';
import { evaluateSemanticAnswer } from '../gemini';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Loader2, 
  RefreshCcw,
  ArrowRight,
  AlertCircle,
  Link as LinkIcon,
  FileCheck,
  FileUp
} from 'lucide-react';

export default function QuizView() {
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [completionAnswer, setCompletionAnswer] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<any>({});
  const [matchingSelected, setMatchingSelected] = useState<{key?: string, value?: string}>({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, 'quizzes', id));
      if (docSnap.exists()) {
        setQuiz(docSnap.data());
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [id]);

  const handleAnswerMCQ = (option: string) => {
    if (answered) return;
    const correct = option === quiz.questions[currentQuestion].correctAnswer;
    setSelectedOption(option);
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    setAnswered(true);
    setUserAnswers(prev => [...prev, {
      questionIndex: currentQuestion,
      type: 'mcq',
      answer: option,
      isCorrect: correct
    }]);
  };

  const handleAnswerCompletion = async () => {
    if (answered || !completionAnswer) return;
    setEvaluating(true);
    try {
      const q = quiz.questions[currentQuestion];
      let correct = completionAnswer.trim() === q.correctAnswer.trim();
      
      // If not exact match, check semantically
      if (!correct) {
        correct = await evaluateSemanticAnswer(q.question, q.correctAnswer, completionAnswer);
      }

      setIsCorrect(correct);
      if (correct) setScore(s => s + 1);
      setAnswered(true);
      setUserAnswers(prev => [...prev, {
        questionIndex: currentQuestion,
        type: 'completion',
        answer: completionAnswer,
        isCorrect: correct
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  const handleMatchingSelect = (type: 'key' | 'value', item: string) => {
    if (answered) return;
    const newSelected = { ...matchingSelected, [type]: item };
    
    if (newSelected.key && newSelected.value) {
      setMatchingPairs({ ...matchingPairs, [newSelected.key]: newSelected.value });
      setMatchingSelected({});
    } else {
      setMatchingSelected(newSelected);
    }
  };

  const handleMatchingSubmit = () => {
    const q = quiz.questions[currentQuestion];
    let correctCount = 0;
    q.pairs.forEach((p: any) => {
      if (matchingPairs[p.key] === p.value) correctCount++;
    });
    
    const correct = correctCount === q.pairs.length;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    setAnswered(true);
    setUserAnswers(prev => [...prev, {
      questionIndex: currentQuestion,
      type: 'matching',
      answer: matchingPairs,
      isCorrect: correct
    }]);
  };

  const nextQuestion = async () => {
    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setCompletionAnswer('');
      setMatchingPairs({});
      setAnswered(false);
      setIsCorrect(false);
    } else {
      setShowResult(true);
      if (auth.currentUser) {
        await addDoc(collection(db, 'scores'), {
          studentId: auth.currentUser.uid,
          teacherId: quiz.userId, // The creator of the quiz
          quizId: id,
          quizTitle: quiz.title,
          score,
          total: quiz.questions.length,
          completedAt: serverTimestamp()
        });
      }
    }
  };

  const [isLinkingRequired, setIsLinkingRequired] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [teacherCode, setTeacherCode] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLinkInQuiz = async () => {
    if (!teacherCode.trim() || !auth.currentUser) return;
    setLinking(true);
    try {
      const cleanCode = teacherCode.trim().toUpperCase();
      const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('teacherCode', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const teacherDoc = snap.docs[0];
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          linkedTeacherId: teacherDoc.id
        });
        setIsLinkingRequired(false);
        showToast('تم الربط بنجاح! يمكنك الآن البدء');
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

  useEffect(() => {
    const checkLinking = async () => {
      if (auth.currentUser) {
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (snap.exists()) {
          const profile = snap.data();
          setUserProfile(profile);
          if (profile.role === 'student' && !profile.linkedTeacherId) {
            setIsLinkingRequired(true);
          }
        }
      }
    };
    checkLinking();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!quiz) return <div>الاختبار غير موجود</div>;

  if (isLinkingRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LinkIcon className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">خطوة واحدة للبدء</h2>
          <p className="text-slate-500 mb-8">
            يرجى إدخال <b>كود المعلم</b> لمرة واحدة فقط لتتمكن من إجراء الاختبار ومشاركة نتيجتك معه.
          </p>
          
          <div className="space-y-4 mb-8 text-right">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">كود المعلم</label>
              <input 
                type="text" 
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                placeholder="مثال: ABCD-123"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono text-xl uppercase"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/')}
              className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700"
            >
              إلغاء
            </button>
            <button 
              onClick={handleLinkInQuiz}
              disabled={linking || !teacherCode}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {linking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'دخول الاختبار'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResult && !reviewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" dir="rtl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg w-full text-center"
        >
          <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black mb-2">أحسنت!</h2>
          <p className="text-slate-500 mb-8 font-medium">لقد أكملت الاختبار بنجاح بمعدل {Math.round((score/quiz.questions.length)*100)}%</p>
          
          <div className="bg-slate-50 p-8 rounded-[2rem] mb-8 border border-slate-100">
            <div className="text-6xl font-black text-indigo-600 mb-2">{score} / {quiz.questions.length}</div>
            <div className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.2em]">النتيجة النهائية</div>
          </div>

          <div className="grid grid-cols-1 gap-3">
             <button 
              onClick={() => setReviewMode(true)}
              className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <FileCheck className="w-5 h-5" />
              مراجعة الإجابات
            </button>
            <button 
              onClick={() => navigate('/')}
              className="bg-indigo-600 text-white w-full py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all"
            >
              العودة للرئيسية
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 text-slate-400 font-black py-4 hover:text-slate-600"
            >
              <RefreshCcw className="w-4 h-4" />
              إعادة الاختبار
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showResult && reviewMode) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8" dir="rtl">
        <div className="flex justify-between items-center mb-8">
           <div className="text-right">
             <h2 className="text-2xl font-black text-slate-900">مراجعة الإجابات</h2>
             <p className="text-slate-500 font-medium">{quiz.title}</p>
           </div>
           <button 
            onClick={() => setReviewMode(false)}
            className="p-3 bg-white border border-slate-200 rounded-xl font-bold flex items-center gap-2"
           >
             <ArrowRight className="w-5 h-5" />
             رجوع
           </button>
        </div>

        <div className="space-y-6">
           {quiz.questions.map((q: any, i: number) => {
             const userAns = userAnswers.find(ua => ua.questionIndex === i);
             return (
               <div key={i} className={`p-8 bg-white rounded-3xl border-2 ${userAns?.isCorrect ? 'border-emerald-100' : 'border-rose-100'} shadow-sm text-right`}>
                 <div className="flex justify-between items-start mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black ${userAns?.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                       {userAns?.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                    </span>
                    <span className="text-slate-400 font-black">سؤال {i + 1}</span>
                 </div>
                 <h3 className="text-xl font-black text-slate-900 mb-6">{q.question}</h3>
                 
                 <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-500 mb-2">إجابتك:</div>
                    <div className={`p-4 rounded-xl font-bold border ${userAns?.isCorrect ? 'bg-emerald-50/30 border-emerald-200 text-emerald-700' : 'bg-rose-50/30 border-rose-200 text-rose-700'}`}>
                       {typeof userAns?.answer === 'string' ? userAns.answer : 
                          Object.entries(userAns?.answer || {}).map(([k,v]: any) => `${k} -> ${v}`).join(', ')}
                    </div>
                    {!userAns?.isCorrect && (
                      <>
                        <div className="text-sm font-bold text-slate-500 mt-4 mb-2">الإجابة الصحيحة:</div>
                        <div className="p-4 rounded-xl font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
                          {q.type === 'matching' ? q.pairs.map((p:any) => `${p.key} -> ${p.value}`).join(', ') : q.correctAnswer}
                        </div>
                      </>
                    )}
                 </div>
               </div>
             );
           })}
        </div>
        
        <button 
           onClick={() => window.print()} 
           className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3"
        >
           <FileUp className="w-5 h-5" />
           حفظ كـ PDF (طباعة الصفحة)
        </button>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8" dir="rtl">
      <div className="flex justify-between items-center mb-12">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <div className="bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm text-sm font-bold text-slate-500">
          سؤال {currentQuestion + 1} من {quiz.questions.length}
        </div>
        <div className="w-6" />
      </div>

      <div className="mb-8">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            className="h-full bg-indigo-600"
          />
        </div>
      </div>

      <motion.div 
        key={currentQuestion}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
            {question.type === 'mcq' ? 'اختيار من متعدد' : 
             question.type === 'boolean' ? 'صح أو خطأ' : 
             question.type === 'completion' ? 'أكمل الجملة' : 'توصيل'}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-12 leading-relaxed">
          {question.question}
        </h2>

        {/* MCQ and Boolean */}
        {(question.type === 'mcq' || question.type === 'boolean') && (
          <div className="grid gap-4">
            {question.options.map((option: string) => {
              const itemIsCorrect = option === question.correctAnswer;
              const isSelected = option === selectedOption;
              
              let statusClass = "border-slate-100 hover:border-indigo-600 hover:bg-indigo-50";
              if (answered) {
                if (itemIsCorrect) statusClass = "border-emerald-500 bg-emerald-50 text-emerald-700";
                else if (isSelected) statusClass = "border-rose-500 bg-rose-50 text-rose-700";
                else statusClass = "border-slate-100 opacity-50";
              }

              return (
                <button
                  key={option}
                  disabled={answered}
                  onClick={() => handleAnswerMCQ(option)}
                  className={`flex items-center justify-between p-5 border-2 rounded-2xl text-right font-bold transition-all ${statusClass}`}
                >
                  <span>{option}</span>
                  {answered && itemIsCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                  {answered && isSelected && !itemIsCorrect && <XCircle className="w-6 h-6 text-rose-500" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Completion */}
        {question.type === 'completion' && (
          <div className="space-y-6">
            <input 
              type="text"
              disabled={answered || evaluating}
              value={completionAnswer}
              onChange={(e) => setCompletionAnswer(e.target.value)}
              placeholder="اكتب إجابتك هنا..."
              className="w-full p-5 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none text-xl font-bold transition-all"
            />
            {!answered && (
              <button 
                onClick={handleAnswerCompletion}
                disabled={evaluating || !completionAnswer}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {evaluating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تحقق من الإجابة'}
              </button>
            )}
            {answered && (
              <div className={`p-6 rounded-2xl flex items-center gap-4 ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500' : 'bg-rose-50 text-rose-700 border-2 border-rose-500'}`}>
                {isCorrect ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                <div>
                  <div className="font-bold">{isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}</div>
                  {!isCorrect && <div className="text-sm opacity-80">الإجابة الصحيحة: {question.correctAnswer}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matching */}
        {question.type === 'matching' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">القائمة أ</div>
                {question.pairs.map((p: any) => (
                  <button
                    key={p.key}
                    disabled={answered || matchingPairs[p.key]}
                    onClick={() => handleMatchingSelect('key', p.key)}
                    className={`w-full p-4 border-2 rounded-xl text-center font-bold transition-all ${
                      matchingPairs[p.key] ? 'bg-slate-100 border-slate-100 text-slate-400' : 
                      matchingSelected.key === p.key ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">القائمة ب</div>
                {question.pairs.map((p: any) => (
                  <button
                    key={p.value}
                    disabled={answered || Object.values(matchingPairs).includes(p.value)}
                    onClick={() => handleMatchingSelect('value', p.value)}
                    className={`w-full p-4 border-2 rounded-xl text-center font-bold transition-all ${
                      Object.values(matchingPairs).includes(p.value) ? 'bg-slate-100 border-slate-100 text-slate-400' : 
                      matchingSelected.value === p.value ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {p.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              <h4 className="text-sm font-bold text-slate-500 mb-4">اختياراتك:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(matchingPairs).map(([k, v]: any) => (
                  <div key={k} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                    {k} <ArrowRight className="w-3 h-3" /> {v}
                    {!answered && <button onClick={() => {
                      const newPairs = { ...matchingPairs };
                      delete newPairs[k];
                      setMatchingPairs(newPairs);
                    }} className="hover:text-rose-600"><XCircle className="w-4 h-4" /></button>}
                  </div>
                ))}
                {Object.keys(matchingPairs).length === 0 && <div className="text-slate-400 italic">ابدأ التوصيل أعلاه...</div>}
              </div>
            </div>

            {!answered && (
              <button 
                onClick={handleMatchingSubmit}
                disabled={Object.keys(matchingPairs).length !== question.pairs.length}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                تحديث النتيجة
              </button>
            )}

            {answered && (
              <div className={`p-6 rounded-2xl flex items-center gap-4 ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500' : 'bg-rose-50 text-rose-700 border-2 border-rose-500'}`}>
                {isCorrect ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                <div>
                  <div className="font-bold">{isCorrect ? 'توصيل صحيح!' : 'توصيل خاطئ'}</div>
                  {!isCorrect && (
                    <div className="text-sm opacity-80 mt-2">
                      {question.pairs.map((p: any) => (
                        <div key={p.key}>{p.key} → {p.value}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {answered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12"
            >
              <button 
                onClick={nextQuestion}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {currentQuestion + 1 === quiz.questions.length ? 'إنهاء الاختبار' : 'السؤال التالي'}
                <ChevronLeft className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
