import React from 'react';
import { RatingHistory } from '../types';

interface RatingChartProps {
  history: RatingHistory[];
}

const RatingChart: React.FC<RatingChartProps> = ({ history }) => {
  if (history.length < 2) {
    return <div className="flex items-center justify-center h-full text-slate-500">Dados insuficientes para exibir o gráfico. Jogue mais partidas!</div>;
  }

  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const ratings = sortedHistory.map(h => h.ratingAfter);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const ratingRange = maxRating - minRating;

  const width = 500;
  const height = 300;
  const padding = 40;

  const getX = (index: number) => padding + (index / (ratings.length - 1)) * (width - padding * 2);
  const getY = (rating: number) => height - padding - ((rating - minRating) / (ratingRange || 1)) * (height - padding * 2);

  const path = ratings.map((rating, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(rating)}`).join(' ');

  const yAxisLabels = [];
  const numLabels = 5;
  for (let i = 0; i < numLabels; i++) {
    const rating = Math.round(minRating + (ratingRange / (numLabels - 1)) * i);
    yAxisLabels.push(rating);
  }
  
  const xAxisLabels = [
    new Date(sortedHistory[0].date).toLocaleDateString('pt-BR', {month: 'short'}),
    new Date(sortedHistory[Math.floor(sortedHistory.length/2)].date).toLocaleDateString('pt-BR', {month: 'short'}),
    new Date(sortedHistory[sortedHistory.length - 1].date).toLocaleDateString('pt-BR', {month: 'short'}),
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Y Axis Labels */}
      {yAxisLabels.map(label => (
        <g key={label}>
          <text x={padding - 10} y={getY(label)} textAnchor="end" alignmentBaseline="middle" fontSize="10" fill="#94a3b8">
            {label}
          </text>
          <line x1={padding} y1={getY(label)} x2={width - padding} y2={getY(label)} stroke="#475569" strokeWidth="0.5" strokeDasharray="2 2" />
        </g>
      ))}

       {/* X Axis Labels */}
       <text x={getX(0)} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{xAxisLabels[0]}</text>
       <text x={getX(Math.floor(ratings.length/2))} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{xAxisLabels[1]}</text>
       <text x={getX(ratings.length - 1)} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{xAxisLabels[2]}</text>


      {/* Chart Line */}
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />

      {/* Data Points */}
      {ratings.map((rating, index) => (
        <circle key={index} cx={getX(index)} cy={getY(rating)} r="3" fill="#3b82f6" className="transition-transform duration-200 hover:scale-150 cursor-pointer">
           <title>Rating: {rating} em {new Date(sortedHistory[index].date).toLocaleDateString('pt-BR')}</title>
        </circle>
      ))}
    </svg>
  );
};

export default RatingChart;