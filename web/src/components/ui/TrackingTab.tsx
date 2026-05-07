import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface TrackingTabProps {
  orders?: any[];
}

export function TrackingTab({ orders }: TrackingTabProps) {
  return (
    <>
      {orders && orders.length > 0 ? (
        orders.map((order) => (
          <motion.div 
            key={order.orderId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full mb-4 border border-white/10 bg-white/[0.02] p-5 animate-pop-bright"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{order.restaurantName || "Swiggy Order"}</h3>
                <p className="text-xs text-white/50 mt-1">Order #{order.orderId}</p>
              </div>
              <span className="bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">{order.orderStatus}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/80">{order.statusMessage || "Order is in progress"}</p>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="col-span-full py-20 text-center border border-dashed border-white/10">
          <MapPin className="mx-auto h-12 w-12 text-white/10 mb-4" />
          <p className="text-sm text-white/30">No active orders found.</p>
        </div>
      )}
    </>
  );
}
