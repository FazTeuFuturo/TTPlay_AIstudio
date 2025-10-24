
import React, { useState, useEffect } from 'react';
import { Club, TournamentEvent } from '../types';
import { addTournamentEvent, updateTournamentEvent } from '../data-service';
import { ArrowLeftIcon } from './Icons';

interface CreateEventFormProps {
  club: Club;
  eventToEdit?: TournamentEvent;
  onFormClose: (event?: TournamentEvent) => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ club, eventToEdit, onFormClose }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');

  const isEditMode = !!eventToEdit;

  useEffect(() => {
    if (isEditMode && eventToEdit) {
        setName(eventToEdit.name);
        setLocation(eventToEdit.location);
        setStartDate(eventToEdit.startDate);
    }
  }, [eventToEdit, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !location || !startDate) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    try {
        if (isEditMode && eventToEdit) {
            const updatedEvent = await updateTournamentEvent(eventToEdit.id, { name, location, startDate });
            alert('Evento atualizado com sucesso!');
            onFormClose(updatedEvent);
        } else {
            const newEvent = await addTournamentEvent({ name, location, startDate }, club);
            alert('Evento criado com sucesso! Agora adicione as categorias.');
            onFormClose(newEvent);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <button onClick={() => onFormClose()} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
            <ArrowLeftIcon className="w-5 h-5"/>
            Voltar
        </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6">
            {isEditMode ? 'Editar Evento' : 'Criar Novo Evento'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-400 bg-red-500/10 p-3 rounded">{error}</p>}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Nome do Evento</label>
            <input 
              type="text" 
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500" 
              required
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-2">Localização (Cidade)</label>
            <input 
              type="text" 
              id="location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500" 
              required
            />
          </div>

          <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-2">Data de Início</label>
              <input 
                type="date" 
                id="startDate"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" 
                required
              />
            </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {isEditMode ? 'Salvar Alterações' : 'Criar Evento e Adicionar Categorias'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventForm;