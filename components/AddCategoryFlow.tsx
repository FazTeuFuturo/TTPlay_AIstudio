import React, { useState } from 'react';
import { ArrowLeftIcon } from './Icons';
import CategoryForm from './CategoryForm';
import { CBTM_CATEGORIES_OLYMPIC } from '../cbtm-categories';
import { addCategoryToEvent } from '../data-service';
import { TournamentCategory } from '../types';

interface AddCategoryFlowProps {
  eventId: string;
  onFormClose: () => void;
}

const AddCategoryFlow: React.FC<AddCategoryFlowProps> = ({ eventId, onFormClose }) => {
  const [flow, setFlow] = useState<'choice' | 'custom' | 'official'>('choice');

  const handleAddOfficialCategory = async (categoryData: Partial<Omit<TournamentCategory, 'id' | 'eventId'>>) => {
    try {
        await addCategoryToEvent({
            eventId,
            ...categoryData,
        } as any);
        alert(`Categoria "${categoryData.name}" adicionada com sucesso!`);
        onFormClose();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro ao adicionar categoria: ${errorMessage}`);
    }
  }

  const renderChoice = () => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6">Como deseja adicionar a categoria?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
                onClick={() => setFlow('official')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-6 rounded-lg transition-colors text-left"
            >
                <h3 className="text-xl font-bold mb-2">Selecionar Categoria Oficial</h3>
                <p className="text-blue-200">Use as categorias pré-definidas da CBTM para agilizar o processo.</p>
            </button>
            <button
                onClick={() => setFlow('custom')}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold p-6 rounded-lg transition-colors text-left"
            >
                <h3 className="text-xl font-bold mb-2">Criar Categoria Personalizada</h3>
                <p className="text-slate-300">Defina suas próprias regras para torneios não-oficiais ou específicos.</p>
            </button>
        </div>
    </div>
  );

  const renderOfficialSelection = () => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6">Selecione uma Categoria Oficial</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-4">
            {CBTM_CATEGORIES_OLYMPIC.map((cat, index) => (
                <div key={index} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-white">{cat.name}</p>
                        <p className="text-xs text-slate-400">
                            {cat.ageMin || cat.ageMax ? `Idade: ${cat.ageMin || 'Até'} - ${cat.ageMax || 'Acima'}` : ''}
                            {cat.ratingMin || cat.ratingMax ? ` Rating: ${cat.ratingMin || 'Até'} - ${cat.ratingMax || 'Acima'}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => handleAddOfficialCategory(cat)}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded text-sm"
                    >
                        Adicionar
                    </button>
                </div>
            ))}
        </div>
    </div>
  );


  const renderContent = () => {
    switch (flow) {
      case 'custom':
        return <CategoryForm eventId={eventId} onFormClose={onFormClose} />;
      case 'official':
        return renderOfficialSelection();
      case 'choice':
      default:
        return renderChoice();
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <button onClick={onFormClose} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
            <ArrowLeftIcon className="w-5 h-5"/>
            Voltar para o Evento
        </button>
        {renderContent()}
    </div>
  );
};

export default AddCategoryFlow;