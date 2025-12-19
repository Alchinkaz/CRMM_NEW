
import React from 'react';
import { UserRole } from '../types';
import { LayoutDashboard, Wrench, Users, Banknote, MessageCircle } from 'lucide-react';

interface BottomNavProps {
  role: UserRole;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role, currentRoute, onNavigate }) => {
  const allItems = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'chat', label: 'Чат', icon: MessageCircle, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'tasks', label: 'Заявки', icon: Wrench, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.ENGINEER] },
    { id: 'employees', label: 'Табель', icon: Users, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'finance', label: 'Финансы', icon: Banknote, roles: [UserRole.ADMIN] },
  ];

  const visibleItems = allItems.filter(item => item.roles.includes(role)).slice(0, 5);
  const activeIndex = visibleItems.findIndex(item => item.id === currentRoute);
  
  // Base width for each segment
  const slotWidthPercent = 100 / visibleItems.length;

  // Edge logic for "moving closer to center"
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === visibleItems.length - 1;
  const edgeOffset = 8; // Offset in pixels from the navbar walls

  return (
    <>
      {/* 
        DEFOCUS LAYER:
        Extreme background blur to create depth and separation for the UI.
      */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 h-64 pointer-events-none z-40 backdrop-blur-[30px]"
        style={{
          WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
          maskImage: 'linear-gradient(to top, black 20%, transparent 100%)'
        }}
      />

      {/* 
        NAVBAR CONTAINER:
        - p-1.5 (6px) provides the basic safe area.
      */}
      <div className="md:hidden fixed bottom-8 left-4 right-4 z-50 select-none">
        <div className="h-[78px] bg-white/10 dark:bg-black/40 backdrop-blur-[15px] border border-white/30 dark:border-white/10 border-t-white/60 dark:border-t-white/20 rounded-[39px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex items-center p-1.5 relative overflow-hidden">
          
          {/* 
            UNIFORM SEGMENT AURA (Active Indicator):
            - Logic: If at edge, shift 'left' or reduce 'width' to pull away from walls.
          */}
          {activeIndex !== -1 && (
            <div 
              className="absolute h-full bg-white/40 dark:bg-white/10 backdrop-blur-2xl rounded-[32px] border border-white/50 dark:border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.1),inset_0_1px_10px_rgba(255,255,255,0.6)] z-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: isFirst || isLast 
                    ? `calc(${slotWidthPercent}% - ${edgeOffset}px)` 
                    : `${slotWidthPercent}%`,
                left: isFirst 
                    ? `${edgeOffset}px` 
                    : `${activeIndex * slotWidthPercent}%`,
                top: '0',
              }}
            >
              {/* Internal Refraction Glow */}
              <div className="absolute top-1.5 left-4 w-[50%] h-[25%] bg-white/30 rounded-full blur-[2px]" />
            </div>
          )}

          {/* BUTTONS: They sit on top of the aura */}
          <div className="flex w-full h-full z-10">
            {visibleItems.map(item => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 active:scale-90"
                >
                  <div className={`transition-all duration-500 flex items-center justify-center ${isActive ? 'scale-110 -translate-y-0.5' : 'opacity-40 scale-100'}`}>
                      <Icon 
                        size={24} 
                        strokeWidth={isActive ? 2.5 : 2}
                        fill={isActive ? "currentColor" : "none"}
                        className="text-black dark:text-white drop-shadow-sm"
                      />
                  </div>
                  
                  <span className={`text-[9px] font-black mt-1 tracking-tighter uppercase transition-all duration-300 text-black dark:text-white ${
                    isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 h-0 overflow-hidden'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
