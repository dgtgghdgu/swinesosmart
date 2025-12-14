import { Pig, HealthStatus, Gender, ServiceResponse } from '../types';

const STORAGE_KEY_PIGS = 'smartfarm_pigs_v3';

// Seed data in Chinese - Updated Locations to match new PENS
const INITIAL_DATA: Pig[] = [
  { id: '1', tagNumber: 'A-101', breed: '大白猪', gender: Gender.SOW, birthDate: '2023-01-15', weightKg: 180, penLocation: '分娩1室', healthStatus: HealthStatus.HEALTHY, lastCheckup: '2023-10-01' },
  { id: '2', tagNumber: 'A-102', breed: '长白猪', gender: Gender.BOAR, birthDate: '2023-02-20', weightKg: 210, penLocation: '分娩1室', healthStatus: HealthStatus.HEALTHY, lastCheckup: '2023-10-05' },
  { id: '3', tagNumber: 'B-004', breed: '杜洛克', gender: Gender.BARROW, birthDate: '2023-06-10', weightKg: 95, penLocation: '保育1室', healthStatus: HealthStatus.SICK, lastCheckup: '2023-10-25', notes: '观察到咳嗽症状' },
  { id: '4', tagNumber: 'B-005', breed: '杜洛克', gender: Gender.GILT, birthDate: '2023-06-12', weightKg: 92, penLocation: '保育1室', healthStatus: HealthStatus.HEALTHY, lastCheckup: '2023-10-10' },
  { id: '5', tagNumber: 'C-201', breed: '皮特兰', gender: Gender.BARROW, birthDate: '2023-08-01', weightKg: 45, penLocation: '育肥1室', healthStatus: HealthStatus.QUARANTINE, lastCheckup: '2023-10-27', notes: '左后腿跛行' },
];

export const StorageService = {
  getPigs: (): ServiceResponse<Pig[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PIGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_PIGS, JSON.stringify(INITIAL_DATA));
        return { success: true, data: INITIAL_DATA };
      }
      return { success: true, data: JSON.parse(data) };
    } catch (e) {
      return { success: false, error: '加载畜牧数据失败' };
    }
  },

  savePig: (pig: Pig): ServiceResponse<Pig> => {
    try {
      const result = StorageService.getPigs();
      if (!result.success || !result.data) throw new Error('DB Error');
      
      const currentPigs = result.data;
      const index = currentPigs.findIndex(p => p.id === pig.id);
      
      let newPigs;
      if (index >= 0) {
        // Update
        newPigs = [...currentPigs];
        newPigs[index] = pig;
      } else {
        // Create
        newPigs = [...currentPigs, pig];
      }
      
      localStorage.setItem(STORAGE_KEY_PIGS, JSON.stringify(newPigs));
      return { success: true, data: pig };
    } catch (e) {
      return { success: false, error: '保存记录失败' };
    }
  },

  deletePig: (id: string): ServiceResponse<void> => {
    try {
      const result = StorageService.getPigs();
      if (!result.success || !result.data) throw new Error('DB Error');
      
      const newPigs = result.data.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY_PIGS, JSON.stringify(newPigs));
      return { success: true };
    } catch (e) {
      return { success: false, error: '删除记录失败' };
    }
  }
};
