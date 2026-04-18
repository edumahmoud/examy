import React from 'react';
import { 
  Users, 
  ClipboardList, 
  Settings as SettingsIcon, 
  LogOut, 
  GraduationCap,
  LayoutDashboard,
  FileText,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { auth, signOut } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  role: 'student' | 'teacher';
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeSection, setActiveSection, role, isOpen, onClose }: SidebarProps) {
  const [isLargeScreen, setIsLargeScreen] = React.useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  React.useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const teacherLinks = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'students', label: 'الطلاب', icon: <Users className="w-5 h-5" /> },
    { id: 'quizzes', label: 'الاختبارات', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'analytics', label: 'التقارير والإحصائيات', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'subjects', label: 'المواد الدراسية', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const studentLinks = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'summaries', label: 'الملخصات', icon: <FileText className="w-5 h-5" /> },
    { id: 'quizzes', label: 'الاختبارات', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'teachers', label: 'المعلمون', icon: <Users className="w-5 h-5" /> },
    { id: 'subjects', label: 'المواد الدراسية', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const links = role === 'teacher' ? teacherLinks : studentLinks;

  const handleLinkClick = (id: string) => {
    setActiveSection(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ x: isLargeScreen || isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-72 bg-white border-l border-slate-100 flex flex-col h-screen fixed right-0 top-0 z-50 shadow-2xl lg:shadow-none"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">EduAI</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                activeSection === link.id 
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <button
            onClick={async () => {
              await signOut(auth);
              window.location.reload();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
