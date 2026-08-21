export interface ClassroomScenario {
  prompt: string;
}


export const textToImageScenario: ClassroomScenario = { prompt: '老虎' };
export const imageToImageScenario: ClassroomScenario = { prompt: '黑色的老虎' };
export const textToMusicScenario: ClassroomScenario = { prompt: '新年' };
export const textToVideoScenario: ClassroomScenario = { prompt: '老虎跳舞' };
export const textTo3DScenario: ClassroomScenario = { prompt: '老虎' };
export const threeViewDrawingScenario: ClassroomScenario = { prompt: '请选择风格毛绒三视图。' };
export const threeViewDrawingTextToImageScenario: ClassroomScenario = { prompt: '老虎' };
export const explodedViewDiagramScenario: ClassroomScenario = { prompt: '产品解构' };
export const explodedViewDiagramTextToImageScenario: ClassroomScenario = { prompt: '陀螺' };
