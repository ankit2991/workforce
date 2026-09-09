import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Check,
  Package,
  Clock,
  CheckCircle2,
  Tag,
  Wallet as WalletIcon,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { Product, CartItem, Order, Wallet } from '../../types';
import { CartDrawer } from './CartDrawer';
import { toast } from 'sonner';

export const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'ORDERS'>('CATALOG');
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const fetchShopData = async () => {
    try {
      const [prodsRes, catsRes, ordersRes, walletRes]: any = await Promise.all([
        apiRequest('/products'),
        apiRequest('/products/categories'),
        apiRequest('/orders'),
        apiRequest('/wallet'),
      ]);

      if (prodsRes) setProducts(prodsRes);
      if (catsRes) setCategories(catsRes);
      if (ordersRes) setOrders(ordersRes);
      if (walletRes) setWallet(walletRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart!`);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesCat =
      selectedCategory === 'all' || prod.categorySlug === selectedCategory;
    const matchesSearch = prod.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="pb-24 pt-2 space-y-5 animate-in fade-in duration-300">
      {/* Wallet Balance & Cart Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#101B24] border border-[#172631]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1687FF]/15 text-[#1687FF] flex items-center justify-center">
            <WalletIcon size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8493A1]">
              Available to Spend
            </span>
            <p className="text-base font-black text-white">
              MYR {(wallet?.availableBalance ?? 1200).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Floating / Bar Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs shadow-md shadow-[#1687FF]/30 hover:opacity-95 transition"
        >
          <ShoppingBag size={16} />
          <span>Cart</span>
          {cartTotalItems > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center">
              {cartTotalItems}
            </span>
          )}
        </button>
      </div>

      {/* Tabs (Catalog / Orders) */}
      <div className="flex items-center bg-[#101B24] p-1 rounded-xl border border-[#172631]">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'CATALOG'
              ? 'bg-[#1687FF] text-white shadow-md'
              : 'text-[#8493A1] hover:text-white'
          }`}
        >
          Store Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'ORDERS'
              ? 'bg-[#1687FF] text-white shadow-md'
              : 'text-[#8493A1] hover:text-white'
          }`}
        >
          My Orders ({orders.length})
        </button>
      </div>

      {activeTab === 'CATALOG' ? (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8493A1]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vouchers, food, electronics..."
              className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#F5F8FA] outline-none transition"
            />
          </div>

          {/* Horizontal Category Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                selectedCategory === 'all'
                  ? 'bg-[#1687FF] border-[#1687FF] text-white shadow-sm'
                  : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:border-[#8493A1]/30'
              }`}
            >
              🏷️ All Deals
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  selectedCategory === cat.slug
                    ? 'bg-[#1687FF] border-[#1687FF] text-white shadow-sm'
                    : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:border-[#8493A1]/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 2-Column Product Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="group rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#1687FF]/50 overflow-hidden shadow-md transition flex flex-col justify-between"
              >
                {/* Image */}
                <div className="relative aspect-square w-full bg-[#050B10] overflow-hidden">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {prod.isFeatured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#1687FF] text-[9px] font-black text-white uppercase tracking-wider shadow">
                      FEATURED
                    </div>
                  )}
                </div>

                {/* Details & Button */}
                <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    <span className="text-[10px] text-[#8493A1] uppercase font-semibold">
                      {prod.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#F5F8FA] line-clamp-2 mt-0.5">
                      {prod.name}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-[#172631] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#8493A1]">Price</span>
                      <p className="text-sm font-black text-[#00C982]">
                        MYR {prod.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(prod)}
                      className="w-8 h-8 rounded-xl bg-[#1687FF] hover:bg-[#389AFF] text-white flex items-center justify-center active:scale-95 transition shadow-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* My Orders Tab */
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="p-8 text-center bg-[#101B24] rounded-2xl border border-[#172631]">
              <Package size={28} className="mx-auto text-[#8493A1] mb-2 opacity-50" />
              <p className="text-xs text-[#8493A1]">No past orders found</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] space-y-3"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#172631]">
                  <div>
                    <span className="text-xs font-bold text-white">
                      #{order.orderNumber}
                    </span>
                    <p className="text-[10px] text-[#8493A1]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00C982]/15 text-[#00C982] border border-[#00C982]/30">
                    {order.status}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover bg-[#050B10]"
                        />
                        <div>
                          <p className="font-semibold text-[#F5F8FA] line-clamp-1">
                            {item.name}
                          </p>
                          <span className="text-[10px] text-[#8493A1]">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-white">
                        MYR {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#172631] flex items-center justify-between text-xs">
                  <span className="text-[#8493A1]">Total Paid (Wallet)</span>
                  <span className="text-sm font-black text-[#1687FF]">
                    MYR {order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onClearCart={() => setCart([])}
        walletBalance={wallet?.availableBalance ?? 1200}
        onOrderSuccess={fetchShopData}
      />
    </div>
  );
};
