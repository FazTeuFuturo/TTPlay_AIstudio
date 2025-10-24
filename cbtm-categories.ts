import { TournamentCategory, Gender, TournamentFormat } from './types';

// This is a simplified representation. A real implementation might need more complex logic for rating bands.
export const CBTM_CATEGORIES_OLYMPIC: Partial<Omit<TournamentCategory, 'id' | 'eventId'>>[] = [
    { name: 'Sub-9', ageMax: 9, gender: Gender.MALE },
    { name: 'Sub-9', ageMax: 9, gender: Gender.FEMALE },
    { name: 'Sub-11', ageMin: 10, ageMax: 11, gender: Gender.MALE },
    { name: 'Sub-11', ageMin: 10, ageMax: 11, gender: Gender.FEMALE },
    { name: 'Sub-13', ageMin: 12, ageMax: 13, gender: Gender.MALE },
    { name: 'Sub-13', ageMin: 12, ageMax: 13, gender: Gender.FEMALE },
    { name: 'Sub-15', ageMin: 14, ageMax: 15, gender: Gender.MALE },
    { name: 'Sub-15', ageMin: 14, ageMax: 15, gender: Gender.FEMALE },
    { name: 'Sub-19', ageMin: 16, ageMax: 19, gender: Gender.MALE },
    { name: 'Sub-19', ageMin: 16, ageMax: 19, gender: Gender.FEMALE },
    { name: 'Sub-21', ageMin: 20, ageMax: 21, gender: Gender.MALE },
    { name: 'Sub-21', ageMin: 20, ageMax: 21, gender: Gender.FEMALE },
    { name: 'Absoluto A (A+B)', ratingMin: 2700, gender: Gender.MALE },
    { name: 'Absoluto A (A+B)', ratingMin: 2000, gender: Gender.FEMALE },
    { name: 'Absoluto C (C+D)', ratingMin: 1900, ratingMax: 2699, gender: Gender.MALE },
    { name: 'Absoluto C (C+D)', ratingMin: 1000, ratingMax: 1999, gender: Gender.FEMALE },
    { name: 'Veterano 40', ageMin: 40, ageMax: 49, gender: Gender.MALE },
    { name: 'Veterano 40', ageMin: 40, ageMax: 49, gender: Gender.FEMALE },
    { name: 'Veterano 50', ageMin: 50, ageMax: 59, gender: Gender.MALE },
    { name: 'Veterano 50', ageMin: 50, ageMax: 59, gender: Gender.FEMALE },
    { name: 'Veterano 60', ageMin: 60, ageMax: 69, gender: Gender.MALE },
    { name: 'Veterano 60', ageMin: 60, ageMax: 69, gender: Gender.FEMALE },
];

CBTM_CATEGORIES_OLYMPIC.forEach(cat => {
    cat.name = `${cat.name} ${cat.gender === Gender.MALE ? 'Masculino' : 'Feminino'}`;
    cat.format = TournamentFormat.GRUPOS_E_ELIMINATORIA;
    cat.maxParticipants = 32;
    cat.entryFee = 50;
    cat.startTime = "09:00";
    cat.playersPerGroup = 4;
});