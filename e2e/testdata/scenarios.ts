export interface ImageGenScenario {
  prompt: string;
}

export const textToImageScenario: ImageGenScenario = { prompt: '老虎' };
export const imageToImageScenario: ImageGenScenario = { prompt: '黑色的老虎' };
