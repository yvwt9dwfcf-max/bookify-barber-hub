 import { useState } from 'react';
 import { PlanType, PLAN_NAMES, PLAN_DISPLAY_LABELS, PLAN_LIMITS } from '@/lib/supabase';
 import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Check, Crown } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface SubscriptionSheetProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   currentPlan: PlanType;
   onSelectPlan?: (plan: PlanType) => void;
 }
 
 const PLAN_ORDER: PlanType[] = ['basic', 'plus', 'pro', 'studio', 'rede'];
 
 export function SubscriptionSheet({ 
   open, 
   onOpenChange, 
   currentPlan,
   onSelectPlan 
 }: SubscriptionSheetProps) {
   const [selectedPlan, setSelectedPlan] = useState<PlanType>(currentPlan);
 
   const handleSelectPlan = (plan: PlanType) => {
     setSelectedPlan(plan);
   };
 
   const handleConfirm = () => {
     if (onSelectPlan && selectedPlan !== currentPlan) {
       onSelectPlan(selectedPlan);
     }
     onOpenChange(false);
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-xl">
         <SheetHeader className="text-left pb-4">
           <SheetTitle className="flex items-center gap-2">
             <Crown className="h-5 w-5 text-primary" />
             Assinatura
           </SheetTitle>
           <SheetDescription>
             Escolha o plano ideal para sua barbearia
           </SheetDescription>
         </SheetHeader>
         
         <div className="space-y-3 pb-6">
           {PLAN_ORDER.map((plan) => {
             const isCurrentPlan = plan === currentPlan;
             const isSelected = plan === selectedPlan;
             
             return (
               <button
                 key={plan}
                 onClick={() => handleSelectPlan(plan)}
                 className={cn(
                   "w-full p-4 rounded-lg border-2 text-left transition-all",
                   "flex items-center justify-between",
                   isSelected 
                     ? "border-primary bg-primary/5" 
                     : "border-border hover:border-primary/50"
                 )}
               >
                 <div className="flex items-center gap-3">
                   <div className={cn(
                     "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                     isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                   )}>
                     {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="font-semibold">{PLAN_NAMES[plan]}</span>
                       {isCurrentPlan && (
                         <Badge variant="secondary" className="text-xs">
                           Atual
                         </Badge>
                       )}
                     </div>
                     <p className="text-sm text-muted-foreground">
                       {PLAN_DISPLAY_LABELS[plan]}
                     </p>
                   </div>
                 </div>
               </button>
             );
           })}
         </div>
 
         <div className="flex gap-3 pt-4 border-t">
           <Button 
             variant="outline" 
             className="flex-1"
             onClick={() => onOpenChange(false)}
           >
             Fechar
           </Button>
           {onSelectPlan && selectedPlan !== currentPlan && (
             <Button 
               className="flex-1 btn-primary-gradient"
               onClick={handleConfirm}
             >
               Alterar plano
             </Button>
           )}
         </div>
       </SheetContent>
     </Sheet>
   );
 }