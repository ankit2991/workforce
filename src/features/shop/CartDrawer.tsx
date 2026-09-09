import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { CartItem } from '../../types';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  walletBalance: number;
  onOrderSuccess: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  walletBalance,
  onOrderSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const totalAmount = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (totalAmount > walletBalance) {
      toast.error(
        `Insufficient wallet balance (Available: MYR ${walletBalance.toFixed(2)})`
      );
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      toast.success(
        `Order confirmed! MYR ${totalAmount.toFixed(2)} deducted from your wallet.`
      );
      onClearCart();
      onOrderSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-[#0B141C] border-t border-[#172631] rounded-t-[28px] p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#172631]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1687FF]/15 text-[#1687FF] flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F8FA]">My Cart</h3>
              <p className="text-[11px] text-[#8493A1]">{cart.length} item(s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-[#8493A1]">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Your cart is currently empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#101B24] border border-[#172631]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover bg-[#050B10]"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#F5F8FA] line-clamp-1">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] font-black text-[#1687FF] mt-0.5">
                      MYR {item.product.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Quantity adjuster */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#050B10] rounded-lg border border-[#172631] p-0.5">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-[#8493A1] hover:text-white"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-[#8493A1] hover:text-white"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, 0)}
                    className="p-1 text-[#8493A1] hover:text-[#FF455B]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Checkout */}
        {cart.length > 0 && (
          <div className="pt-3 border-t border-[#172631] space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#8493A1]">
                <span>Wallet Balance</span>
                <span className="font-bold text-white">
                  MYR {walletBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#8493A1]">
                <span>Delivery Fee</span>
                <span className="text-[#00C982] font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#172631]">
                <span>Total Amount</span>
                <span className="text-[#1687FF] text-base font-black">
                  MYR {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || totalAmount > walletBalance}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-sm shadow-lg shadow-[#1687FF]/25 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Confirming Purchase...'
              ) : (
                <>
                  Pay with Wallet (MYR {totalAmount.toFixed(2)}) <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
