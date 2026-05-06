import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBasket, X, Check } from "lucide-react";
import { Recommendation, DashboardAction, AgentResponse } from "@/types/dashboard";
import { RecommendationCard } from "./RecommendationCard";

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menu: Recommendation[];
  actions: DashboardAction[];
  runAction: (action: DashboardAction) => void;
  addToast: (message: string, type: "success" | "error" | "info") => void;
}

export function MenuModal({ isOpen, onClose, menu, actions, runAction, addToast }: MenuModalProps) {
  return (
    <AnimatePresence>
      {isOpen && menu && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl max-h-full flex flex-col bg-[#101312] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">Restaurant Menu</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide grid gap-6 sm:grid-cols-2">
              {menu.map(item => {
                const action = actions.find(a => a.payload?.recommendationId === item.id);
                return <RecommendationCard key={item.id} item={item} onAction={() => action ? runAction(action) : addToast("No action available", "info")} />
              })}
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => runAction({ id: "view_cart", label: "View Cart", type: "view_cart", status: "ready", payload: { restaurantId: menu?.[0]?.raw?.restaurantId } })} 
                className="bg-[#f75000] text-black px-6 py-3 font-bold flex items-center gap-2 hover:bg-[#ff7a3d]"
              >
                <ShoppingBasket className="h-4 w-4" /> View Cart & Checkout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any;
  runAction: (action: DashboardAction) => void;
}

export function CartModal({ isOpen, onClose, cart, runAction }: CartModalProps) {
  return (
    <AnimatePresence>
      {isOpen && cart && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md max-h-full flex flex-col bg-[#101312] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <p className="text-sm text-white/50 mb-4">Cart Total: <strong className="text-white">Rs {cart.cart?.cartTotal || cart.cartTotal || 0}</strong></p>
              {cart.cart?.cartItems?.map((item: any, i: number) => (
                <div key={i} className="mb-4 border border-white/5 bg-black/20 p-4">
                  <p className="font-bold text-sm">{item.name || "Item"}</p>
                  <p className="text-xs text-white/40 mt-1">Qty: {item.quantity} • Rs {item.subTotal || item.price}</p>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-white/10">
              <button onClick={() => {
                onClose();
                runAction({ id: "checkout", label: "Checkout", type: "order_food", status: "ready", payload: { estimatedPrice: cart.cart?.cartTotal } });
              }} className="w-full bg-[#f75000] text-black px-6 py-3 font-bold flex items-center justify-center gap-2 hover:bg-[#ff7a3d]">
                <Check className="h-4 w-4" /> Place Order
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
