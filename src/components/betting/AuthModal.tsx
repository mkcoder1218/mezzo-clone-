import { X, Phone, Lock, Shield, ChevronRight, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, FormEvent } from 'react';
import { useLogin, useRegister } from '../../modules/auth/hooks';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'register';
  onSwitch: (type: 'login' | 'register') => void;
  onSuccess: (user: any) => void;
}

const CustomSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <div 
    onClick={onChange}
    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${checked ? 'bg-brand-primary' : 'bg-brand-line'}`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-7' : 'left-1'}`} />
  </div>
);

export default function AuthModal({ isOpen, onClose, type, onSwitch, onSuccess }: AuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeRules, setAgreeRules] = useState(true);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const fullPhone = phoneNumber.startsWith("+") ? phoneNumber : `+251${phoneNumber.replace(/^0+/, "")}`;
      if (type === 'login') {
        const data = await loginMutation.mutateAsync({ 
          phoneNumber: fullPhone,
          password 
        });
        onSuccess(data.user);
      } else {
        if (password !== confirmPassword) {
          alert("Passwords do not match");
          return;
        }
        const data = await registerMutation.mutateAsync({
          phoneNumber: fullPhone,
          password,
          role: 'user'
        });
        onSuccess(data.user);
      }
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Authentication failed');
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-brand-surface w-full max-w-md overflow-hidden relative z-10 border border-brand-border rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-[0.03]" />

            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-[0_0_15px_rgba(189,233,30,0.25)]">
                      <Shield className="text-black w-5 h-5" />
                   </div>
                   <h2 className="text-white font-black text-xl uppercase tracking-tighter italic">
                     {type === 'login' ? 'LOGIN' : 'REGISTER'}
                   </h2>
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 pl-1">Phone number (Ethiopia)</label>
                    <div className="flex gap-2">
                      <div className="bg-black border border-brand-border px-4 py-3 text-brand-primary font-black rounded-xl min-w-[70px] text-center text-sm shadow-inner">
                        +251
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input 
                          type="tel" 
                          placeholder="911234567"
                          className="w-full bg-black border border-brand-border px-12 py-3 text-white focus:outline-none focus:border-brand-primary placeholder:text-zinc-700 font-bold rounded-xl transition-all shadow-inner text-sm"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 pl-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="password" 
                        placeholder="••••••••••••"
                        className="w-full bg-black border border-brand-border px-12 py-3 text-white focus:outline-none focus:border-brand-primary placeholder:text-zinc-700 font-bold rounded-xl transition-all shadow-inner text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {type === 'register' && (
                    <div>
                      <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2 pl-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <input 
                          type="password" 
                          placeholder="••••••••••••"
                          className="w-full bg-black border border-brand-border px-12 py-3 text-white focus:outline-none focus:border-brand-primary placeholder:text-zinc-700 font-bold rounded-xl transition-all shadow-inner text-sm"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 px-1">
                    <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wide">
                      {type === 'login' ? 'Remember me' : 'Agree to rules'}
                    </span>
                    <CustomSwitch 
                      checked={type === 'login' ? rememberMe : agreeRules} 
                      onChange={() => type === 'login' ? setRememberMe(!rememberMe) : setAgreeRules(!agreeRules)} 
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isPending}
                  className="group relative w-full bg-brand-primary hover:brightness-105 text-black font-black py-4 rounded-xl text-sm uppercase transition-all mt-4 disabled:opacity-50 overflow-hidden shadow-[0_0_20px_rgba(189,233,30,0.2)]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isPending ? 'PROCESSING...' : (type === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT')}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </button>

                {type === 'login' && (
                  <div className="text-center space-y-6 mt-8">
                    <div className="flex items-center gap-4 text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em]">
                       <div className="flex-1 h-[1px] bg-zinc-800" />
                       OR
                       <div className="flex-1 h-[1px] bg-zinc-800" />
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => onSwitch('register')}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white font-black py-4 rounded-xl text-sm uppercase hover:bg-zinc-800 transition-all border-b-2 border-b-brand-green/20"
                    >
                      REGISTER NEW ACCOUNT
                    </button>

                    <div className="flex items-center justify-center gap-4 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                       <div className="flex items-center gap-1.5"><Globe size={10} /> ADDIS ABABA</div>
                       <div className="flex items-center gap-1.5"><Shield size={10} /> SECURE NODE</div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
