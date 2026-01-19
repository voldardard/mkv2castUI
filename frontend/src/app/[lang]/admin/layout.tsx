'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  FileVideo,
  Settings,
  Palette,
  ChevronLeft,
  Menu,
  X,
  Loader2,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const lang = params.lang as string || 'en';
  const { data: session, status } = useSession();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          router.push(`/${lang}/auth/login`);
          return;
        }
        
        const response = await api.get('/api/auth/me/', {
          headers: { Authorization: `Token ${token}` }
        });
        const user = response.data;
        
        if (!user.is_admin) {
          router.push(`/${lang}`);
          return;
        }
        
        setCurrentUser(user);
      } catch (err) {
        // Token invalid, remove it
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.push(`/${lang}/auth/login`);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [lang, router]);

  const navigation = [
    { name: 'Dashboard', href: `/${lang}/admin`, icon: LayoutDashboard },
    { name: 'Users', href: `/${lang}/admin/users`, icon: Users },
    { name: 'Files', href: `/${lang}/admin/files`, icon: FileVideo },
    { name: 'Settings', href: `/${lang}/admin/settings`, icon: Settings },
    { name: 'Branding', href: `/${lang}/admin/branding`, icon: Palette },
  ];

  const isActive = (href: string) => {
    if (href === `/${lang}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-surface-800 rounded-lg text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 transition-all duration-300
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-surface-900 border-r border-surface-800
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-800">
          <Link href={`/${lang}/admin`} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <span className="text-lg font-bold text-white">Admin</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-1 text-surface-400 hover:text-white transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${active
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-800">
          <Link
            href={`/${lang}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Back to Site</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={`
          transition-all duration-300
          ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
        `}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
