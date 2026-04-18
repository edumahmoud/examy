import React, { useState } from 'react';
import { UserProfile } from '../App';
import { db, updateDoc, doc, deleteDoc, auth, signOut } from '../firebase';
import { motion } from 'motion/react';
import { useToast } from './Toast';
import { 
  User, 
  Save, 
  ArrowRight, 
  Loader2,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';

interface SettingsProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onClose: () => void;
}

export default function Settings({ profile, setProfile, onClose }: SettingsProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(profile.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!profile.uid) return;
    setDeleting(true);
    try {
      if (auth.currentUser) {
         await auth.currentUser.delete();
      }
      // Delete user profile from Firestore
      await deleteDoc(doc(db, 'users', profile.uid));
      
      showToast('تم حذف الحساب والبيانات بنجاح');
      window.location.reload();
    } catch (error: any) {
      console.error("Delete failed", error);
      if (error.code === 'auth/requires-recent-login') {
         showToast('يرجى تسجيل الخروج ثم تسجيل الدخول مرة أخرى لحذف الحساب لأسباب أمنية.', 'error');
         setTimeout(() => {
             signOut(auth).then(() => window.location.reload());
         }, 3000);
      } else {
        showToast('فشل في حذف الحساب', 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        name: name.trim()
      });
      setProfile({ ...profile, name: name.trim() });
      showToast('تم تحديث البيانات بنجاح');
      onClose();
    } catch (error) {
      console.error("Save failed", error);
      showToast('فشل في حفظ البيانات', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">الإعدادات</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              الاسم الكامل
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="أدخل اسمك الجديد"
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-bold">معلومات الحساب</span>
            </div>
            <div className="text-sm text-slate-400 font-mono break-all">{profile.email}</div>
            <div className="mt-2 inline-block px-2 py-1 bg-indigo-100 text-indigo-600 font-bold text-[10px] rounded uppercase tracking-wider">
              {profile.role === 'teacher' ? 'معلم' : 'طالب'}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-rose-500 text-sm font-bold flex items-center gap-2 hover:text-rose-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              حذف الحساب بشكل نهائي
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              رجوع
            </button>
            <button 
              type="submit"
              disabled={saving || !name.trim() || name === profile.name}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              حفظ التغييرات
            </button>
          </div>
        </form>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black mb-2">حذف الحساب؟</h3>
              <p className="text-slate-500 mb-8 font-medium">سيتم حذف حسابك وبياناتك نهائياً. قد يطلب منك تسجيل الدخول مجدداً لتأكيد هويتك.</p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  تأكيد الحذف النهائي
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full py-4 text-slate-400 font-bold hover:text-slate-600"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
