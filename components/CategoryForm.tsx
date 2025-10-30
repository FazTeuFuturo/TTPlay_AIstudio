import React, { useState, useEffect } from 'react';
import { TournamentFormat, Gender, TournamentCategory } from '../types';
import { addCategoryToEvent, updateCategory } from '../data-service';
import { ArrowLeftIcon } from './Icons';

interface CategoryFormProps {
  eventId: string;
  categoryToEdit?: TournamentCategory;
  onFormClose: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ eventId, categoryToEdit, onFormClose }) => {
    const isEditMode = !!categoryToEdit;

    const [name, setName] = useState('');
    const [format, setFormat] = useState<TournamentFormat>(TournamentFormat.GRUPOS_E_ELIMINATORIA);
    const [gender, setGender] = useState<Gender | 'MIXED'>(Gender.MALE);
    const [ageMin, setAgeMin] = useState('');
    const [ageMax, setAgeMax] = useState('');
    const [ratingMin, setRatingMin] = useState('');
    const [ratingMax, setRatingMax] = useState('');
    const [maxParticipants, setMaxParticipants] = useState('16');
    const [entryFee, setEntryFee] = useState('0');
    const [startTime, setStartTime] = useState('');
    const [playersPerGroup, setPlayersPerGroup] = useState('4');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditMode && categoryToEdit) {
            setName(categoryToEdit.name);
            setFormat(categoryToEdit.format);
            setGender(categoryToEdit.gender);
            setAgeMin(String(categoryToEdit.ageMin || ''));
            setAgeMax(String(categoryToEdit.ageMax || ''));
            setRatingMin(String(categoryToEdit.ratingMin || ''));
            setRatingMax(String(categoryToEdit.ratingMax || ''));
            setMaxParticipants(String(categoryToEdit.maxParticipants));
            setEntryFee(String(categoryToEdit.entryFee));
            setStartTime(categoryToEdit.startTime || '');
            setPlayersPerGroup(String(categoryToEdit.playersPerGroup || '4'));
        }
    }, [categoryToEdit, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name) {
      setError('O nome da categoria é obrigatório.');
      return;
    }
    
    const categoryData = {
        eventId,
        name,
        format,
        gender,
        ageMin: ageMin ? parseInt(ageMin) : undefined,
        ageMax: ageMax ? parseInt(ageMax) : undefined,
        ratingMin: ratingMin ? parseInt(ratingMin) : undefined,
        ratingMax: ratingMax ? parseInt(ratingMax) : undefined,
        maxParticipants: parseInt(maxParticipants, 10),
        entryFee: parseFloat(entryFee),
        startTime: startTime || undefined,
        playersPerGroup: format === TournamentFormat.GRUPOS_E_ELIMINATORIA ? parseInt(playersPerGroup) : undefined,
    };

    try {
        if (isEditMode && categoryToEdit) {
            await updateCategory(categoryToEdit.id, categoryData);
            alert('Categoria atualizada com sucesso!');
        } else {
            await addCategoryToEvent(categoryData);
            alert('Categoria criada com sucesso!');
        }
        onFormClose();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <button onClick={onFormClose} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
            <ArrowLeftIcon className="w-5 h-5"/>
            Voltar para o Evento
        </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6">
            {isEditMode ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-400 bg-red-500/10 p-3 rounded">{error}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Nome da Categoria</label>
              <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required />
            </div>
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-slate-300 mb-2">Formato</label>
              <select id="format" value={format} onChange={e => setFormat(e.target.value as TournamentFormat)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                <option value={TournamentFormat.GRUPOS_E_ELIMINATORIA}>Fase de Grupos e Eliminatória</option>
                <option value={TournamentFormat.ELIMINATORIA_SIMPLES}>Eliminatória Simples</option>
                <option value={TournamentFormat.TODOS_CONTRA_TODOS}>Todos contra Todos</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {format === TournamentFormat.GRUPOS_E_ELIMINATORIA && (
              <div>
                  <label htmlFor="playersPerGroup" className="block text-sm font-medium text-slate-300 mb-2">Jogadores por Grupo</label>
                  <input type="number" id="playersPerGroup" value={playersPerGroup} onChange={e => setPlayersPerGroup(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-2">Gênero</label>
              <select id="gender" value={gender} onChange={e => setGender(e.target.value as Gender | 'MIXED')} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                <option value={Gender.MALE}>Masculino</option>
                <option value={Gender.FEMALE}>Feminino</option>
                <option value={'MIXED'}>Misto</option>
              </select>
            </div>
             <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-slate-300 mb-2">Horário de Início</label>
              <input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-300 mb-2">Restrições (Opcional)</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label htmlFor="ageMin" className="block text-xs text-slate-400 mb-1">Idade Mín.</label>
                    <input type="number" id="ageMin" value={ageMin} onChange={e => setAgeMin(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
                <div>
                    <label htmlFor="ageMax" className="block text-xs text-slate-400 mb-1">Idade Máx.</label>
                    <input type="number" id="ageMax" value={ageMax} onChange={e => setAgeMax(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
                 <div>
                    <label htmlFor="ratingMin" className="block text-xs text-slate-400 mb-1">Rating Mín.</label>
                    <input type="number" id="ratingMin" value={ratingMin} onChange={e => setRatingMin(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
                <div>
                    <label htmlFor="ratingMax" className="block text-xs text-slate-400 mb-1">Rating Máx.</label>
                    <input type="number" id="ratingMax" value={ratingMax} onChange={e => setRatingMax(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
            </div>
          </fieldset>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="entryFee" className="block text-sm font-medium text-slate-300 mb-2">Taxa de Inscrição (R$)</label>
                <input type="number" id="entryFee" step="0.01" value={entryFee} onChange={e => setEntryFee(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
            </div>
            <div>
                <label htmlFor="maxParticipants" className="block text-sm font-medium text-slate-300 mb-2">Máx. de Participantes</label>
                <input type="number" id="maxParticipants" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {isEditMode ? 'Salvar Alterações' : 'Adicionar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;
