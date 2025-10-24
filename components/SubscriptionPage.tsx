
import React, { useState } from 'react';
import { getClubByAdminId, upgradeClubSubscription, getCurrentUserSession } from '../data-service';
import { ArrowLeftIcon, SpinnerIcon } from './Icons';

interface SubscriptionPageProps {
    onSubscribed: () => void;
    onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onSubscribed, onBack }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscription = async () => {
        setIsLoading(true);
        const session = await getCurrentUserSession();
        if (!session) {
            alert("Sessão não encontrada. Por favor, faça login novamente.");
            setIsLoading(false);
            return;
        }
        
        const club = await getClubByAdminId(session.userId);
        if (!club) {
            alert("Clube não encontrado.");
            setIsLoading(false);
            return;
        }

        try {
            await upgradeClubSubscription(club.id);
            alert("Parabéns! Seu clube agora é Pro. Todas as funcionalidades foram desbloqueadas.");
            onSubscribed();
        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao processar assinatura: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
                <ArrowLeftIcon className="w-5 h-5"/>
                Voltar para o Painel
            </button>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                <h1 className="text-4xl font-extrabold text-white mb-4">Plano Pro</h1>
                <p className="text-xl text-slate-300 mb-8">Leve a gestão do seu clube para o próximo nível.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left my-12">
                    <div className="bg-slate-800 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-slate-400 mb-4">Plano Gratuito</h3>
                        <ul className="space-y-2 text-slate-300">
                            <li className="flex items-center gap-3"><span className="text-red-500 text-xl">&times;</span> 1 Evento por vez</li>
                            <li className="flex items-center gap-3"><span className="text-red-500 text-xl">&times;</span> 5 Categorias por evento</li>
                            <li className="flex items-center gap-3"><span className="text-red-500 text-xl">&times;</span> Descontos personalizáveis</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Funcionalidades básicas</li>
                        </ul>
                    </div>
                    <div className="bg-blue-900/50 border-2 border-blue-500 p-6 rounded-lg shadow-2xl">
                        <h3 className="text-lg font-bold text-yellow-400 mb-4">Plano Pro</h3>
                        <ul className="space-y-2 text-white">
                             <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Eventos ilimitados</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Categorias ilimitadas</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Descontos personalizáveis</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Suporte Prioritário</li>
                        </ul>
                    </div>
                </div>

                <div>
                    <p className="text-5xl font-bold text-white">R$ 49,90<span className="text-lg text-slate-400">/mês</span></p>
                    <button
                        onClick={handleSubscription}
                        disabled={isLoading}
                        className="mt-8 w-full max-w-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-4 px-6 rounded-lg transition-colors text-lg disabled:bg-slate-600 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isLoading ? <SpinnerIcon className="w-6 h-6"/> : 'Assinar Plano Pro'}
                    </button>
                    <p className="text-xs text-slate-500 mt-4">Pagamento simulado. Nenhum cartão de crédito é necessário.</p>
                </div>
            </div>
        </div>
    )
}

export default SubscriptionPage;