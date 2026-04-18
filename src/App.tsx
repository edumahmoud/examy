import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate 
} from 'react-router-dom';
import { 
  auth, 
  db, 
  signInWithPopup, 
  googleProvider, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  FirebaseUser,
  serverTimestamp
} from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  LogOut, 
  User, 
  Plus, 
  GraduationCap, 
  Users, 
  CheckCircle,
  BrainCircuit,
  Loader2,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

// --- Components ---
import Auth from './components/Auth';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import SummaryView from './components/SummaryView';
import QuizView from './components/QuizView';
import { ToastProvider } from './components/Toast';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  teacherCode?: string;
  linkedTeacherId?: string; // Kept for backwards compatibility
  linkedTeacherIds?: string[];
}


export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <ToastProvider>
          <div className="min-h-screen bg-slate-50 font-sans text-slate-900" dir="rtl">
            <Routes>
              <Route 
                path="/auth" 
                element={user ? <Navigate to="/" /> : <Auth />} 
              />
              <Route 
                path="/" 
                element={
                  user ? (
                    profile ? (
                      profile.role === 'teacher' ? 
                        <TeacherDashboard profile={profile} setProfile={setProfile} /> : 
                        <StudentDashboard profile={profile} setProfile={setProfile} />
                    ) : (
                      <RoleSelection user={user} setProfile={setProfile} />
                    )
                  ) : (
                    <Navigate to="/auth" />
                  )
                } 
              />
              <Route path="/summary/:id" element={user ? <SummaryView /> : <Navigate to="/auth" />} />
              <Route path="/quiz/:id" element={user ? <QuizView /> : <Navigate to="/auth" />} />
            </Routes>
          </div>
        </ToastProvider>
      </Router>
    </ErrorBoundary>
  );
}

function RoleSelection({ user, setProfile }: { user: FirebaseUser, setProfile: (p: UserProfile) => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user.displayName || '');

  const selectRole = async (role: 'student' | 'teacher') => {
    if (!name.trim()) {
      alert('يرجى إدخال اسمك أولاً');
      return;
    }
    setLoading(true);
    const newProfile: UserProfile = {
      uid: user.uid,
      name: name.trim(),
      email: user.email || '',
      role,
      teacherCode: role === 'teacher' ? Math.random().toString(36).substring(7).toUpperCase() : undefined
    };

    await setDoc(doc(db, 'users', user.uid), {
      ...newProfile,
      createdAt: serverTimestamp()
    });

    setProfile(newProfile);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
      >
        <GraduationCap className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">مرحباً بك في EduAI</h1>
        <p className="text-slate-500 mb-8">أكمل بياناتك للبدء</p>
        
        <div className="mb-8 text-right">
          <label className="block text-sm font-bold text-slate-700 mb-2">اسمك الكامل</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسمك هنا"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        <p className="text-xs text-slate-400 mb-4 text-right font-bold uppercase tracking-wider">اختر نوع الحساب</p>
        <div className="grid gap-4">
          <button
            onClick={() => selectRole('student')}
            disabled={loading}
            className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-right">
                <div className="font-bold">أنا طالب</div>
                <div className="text-sm text-slate-500">أريد تلخيص دروسي واختبار نفسي</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={() => selectRole('teacher')}
            disabled={loading}
            className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl hover:border-emerald-600 hover:bg-emerald-50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-right">
                <div className="font-bold">أنا معلم</div>
                <div className="text-sm text-slate-500">أريد إدارة طلابي ومتابعة أدائهم</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
