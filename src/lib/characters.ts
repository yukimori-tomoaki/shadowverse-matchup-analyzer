import { CharacterProfile, CharacterId } from './types';
import { MONO_PROFILE } from '@/prompts/mono';
import { TETRA_PROFILE } from '@/prompts/tetra';
import { ENNEA_PROFILE } from '@/prompts/ennea';
import { DREIZEHN_PROFILE } from '@/prompts/dreizehn';

export interface EnhancedCharacterProfile extends CharacterProfile {
  firstPerson: string;
  corePhilosophy: string;
  toneExamples: string[];
}

export const CHARACTERS: Record<CharacterId, EnhancedCharacterProfile> = {
  mono: {
    id: 'mono',
    name: MONO_PROFILE.name,
    role: MONO_PROFILE.role,
    color: '#e11d48', // rose-600
    accentColor: '#ffe4e6',
    avatarIcon: '🌹',
    description: '長期的な視点や挑戦の価値を重んじ、演劇的かつ情熱的に可能性を語る。ただし実現条件は冷徹に見定める。',
    firstPerson: MONO_PROFILE.firstPerson,
    corePhilosophy: MONO_PROFILE.corePhilosophy,
    toneExamples: MONO_PROFILE.toneExamples,
  },
  tetra: {
    id: 'tetra',
    name: TETRA_PROFILE.name,
    role: TETRA_PROFILE.role,
    color: '#0284c7', // sky-600
    accentColor: '#e0f2fe',
    avatarIcon: '⚙️',
    description: '客観的事実と論理的整合性を厳格に区別。リスクと実現可能性を冷静に分析し、常に丁寧語で批評する。',
    firstPerson: TETRA_PROFILE.firstPerson,
    corePhilosophy: TETRA_PROFILE.corePhilosophy,
    toneExamples: TETRA_PROFILE.toneExamples,
  },
  ennea: {
    id: 'ennea',
    name: ENNEA_PROFILE.name,
    role: ENNEA_PROFILE.role,
    color: '#10b981', // emerald-500
    accentColor: '#d1fae5',
    avatarIcon: '🌱',
    description: '関わる人々の心理的負担や取り残される視点を拾い上げる。控えめながら寄り添い、負担を和らげる代替案を提示する。',
    firstPerson: ENNEA_PROFILE.firstPerson,
    corePhilosophy: ENNEA_PROFILE.corePhilosophy,
    toneExamples: ENNEA_PROFILE.toneExamples,
  },
  dreizehn: {
    id: 'dreizehn',
    name: DREIZEHN_PROFILE.name,
    role: DREIZEHN_PROFILE.role,
    color: '#d97706', // amber-600
    accentColor: '#fef3c7',
    avatarIcon: '⚖️',
    description: '終末機関。不必要な暴力を嫌い対話を重視する調停者。三姉妹の議論を多角的に検証し、独自の調停基準で最終判断を下す。',
    firstPerson: DREIZEHN_PROFILE.firstPerson,
    corePhilosophy: DREIZEHN_PROFILE.corePhilosophy,
    toneExamples: DREIZEHN_PROFILE.toneExamples,
  },
};
