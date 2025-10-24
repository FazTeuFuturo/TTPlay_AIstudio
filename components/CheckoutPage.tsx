import React, { useState, useEffect, useMemo } from 'react';
import { User, CartItem, TournamentCategory, TournamentEvent } from '../types';
import { getCart, getCategoryById, getEventById, removeFromCart } from '../data-service';
import { ArrowLeftIcon, PingPongPaddleIcon } from './Icons';

interface CheckoutPageProps {
  currentUser: User;
  onCheckout: () => void;
  onBack: () => void;
}

interface CartDetailItem {
  category: TournamentCategory;
  event: TournamentEvent;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ currentUser, onCheckout, onBack }) => {
  const [cartDetails, setCartDetails] = useState<CartDetailItem[]>([]);

  const fetchCartDetails = async () => {
    const cart = getCart();
    const detailsPromises = cart.map(async (item) => {
      const category = await getCategoryById(item.categoryId);
      const event = await getEventById(item.eventId);
      return (category && event) ? { category, event } : null;
    });
    const details = (await Promise.all(detailsPromises)).filter((item): item is CartDetailItem => item !== null);
    setCartDetails(details);
  };

  useEffect(() => {
    fetchCartDetails();
  }, []);

  const handleRemoveItem = (categoryId: string) => {
    removeFromCart(categoryId);
    fetchCartDetails();
  }

  const { subtotal, totalDiscount, total } = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;

    const itemsByEvent = cartDetails.reduce((acc, item) => {
      acc[item.event.id] = acc[item.event.id] || [];
      acc[item.event.id].push(item.category);
      return acc;
    }, {} as Record<string, TournamentCategory[]>);

    Object.values(itemsByEvent).forEach(categoriesInEvent => {
      categoriesInEvent.sort((a, b) => b.entryFee - a.entryFee); // Apply discount to cheaper items first
      categoriesInEvent.forEach((category, index) => {
        subtotal += category.entryFee;
        if (index === 1) { // 10% discount on 2nd category
          totalDiscount += category.entryFee * 0.10;
        } else if (index >= 2) { // 15% discount on 3rd and subsequent
          totalDiscount += category.entryFee * 0.15;
        }
      });
    });

    return {
      subtotal,
      totalDiscount,
      total: subtotal - totalDiscount,
    };
  }, [cartDetails]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
        <ArrowLeftIcon className="w-5 h-5"/>
        Continuar Navegando
      </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h1 className="text-3xl font-extrabold text-white mb-6">Resumo das Inscrições</h1>
        
        {cartDetails.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Seu carrinho de inscrições está vazio.</p>
        ) : (
          <div className="space-y-4">
            {cartDetails.map(({ category, event }) => (
              <div key={category.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-lg">
                <div>
                  <p className="font-bold text-white">{category.name}</p>
                  <p className="text-sm text-slate-400">{event.name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-white">R$ {category.entryFee.toFixed(2)}</p>
                  <button 
                    onClick={() => handleRemoveItem(category.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}

            <div className="border-t border-slate-700 pt-6 mt-6 space-y-3">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Descontos Aplicados</span>
                <span>- R$ {totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-slate-700 mt-2">
                <span>Total a Pagar</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={onCheckout}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-colors text-lg"
              >
                Finalizar Inscrição e Pagar
              </button>
               <p className="text-center text-xs text-slate-500 mt-4">
                Você será inscrito em todas as categorias acima. O pagamento é simulado.
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;