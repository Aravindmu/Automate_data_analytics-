import { create } from 'zustand';
import { Project, Dataset, DatasetProfile, TrainingResult, ExperimentItem } from '@/types';

export type WorkspaceTab = 
  | 'overview' 
  | 'ingestion' 
  | 'inspection' 
  | 'cleaning' 
  | 'eda' 
  | 'feature_extraction'
  | 'feature_engineering' 
  | 'feature_selection'
  | 'leakage_check'
  | 'automl'
  | 'training'
  | 'evaluation' 
  | 'prediction' 
  | 'model_intelligence'
  | 'reports' 
  | 'experiments';

interface AppState {
  currentProject: Project | null;
  projects: Project[];
  currentDataset: Dataset | null;
  datasets: Dataset[];
  activeTab: WorkspaceTab;
  currentProfile: DatasetProfile | null;
  trainingResult: TrainingResult | null;
  selectedExperiment: ExperimentItem | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  setDatasets: (datasets: Dataset[]) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  setCurrentProfile: (profile: DatasetProfile | null) => void;
  setTrainingResult: (result: TrainingResult | null) => void;
  setSelectedExperiment: (exp: ExperimentItem | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentProject: null,
  projects: [],
  currentDataset: null,
  datasets: [],
  activeTab: 'overview',
  currentProfile: null,
  trainingResult: null,
  selectedExperiment: null,
  theme: 'light',
  isLoading: false,
  loadingMessage: '',

  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
  setDatasets: (datasets) => set({ datasets }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setCurrentProfile: (currentProfile) => set({ currentProfile }),
  setTrainingResult: (trainingResult) => set({ trainingResult }),
  setSelectedExperiment: (selectedExperiment) => set({ selectedExperiment }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
  setLoading: (isLoading, loadingMessage = '') => set({ isLoading, loadingMessage }),
}));
