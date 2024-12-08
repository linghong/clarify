import html2canvas from 'html2canvas';

export async function takeScreenshot(selector: string = '.pdf-viewer'): Promise<string | null> {

  try {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error('PDF viewer element not found');
    }

    const canvas = await html2canvas(element as HTMLElement);
    const base64String = canvas.toDataURL('image/png').split(',')[1];
    return base64String;

  } catch (error) {
    console.error('Error taking screenshot:', error);
    return null;
  }
}

