export interface MusicTrack {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  artist: string;
  duration: string;
  uploadedAt: string;
}

class MusicService {
  private baseUrl = '/api/music';

  async getAllMusic(): Promise<MusicTrack[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching music:', error);
      throw error;
    }
  }

  async getMusicById(id: number): Promise<MusicTrack> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching music by ID:', error);
      throw error;
    }
  }

  async uploadMusic(file: File): Promise<MusicTrack> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading music:', error);
      throw error;
    }
  }

  async deleteMusic(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting music:', error);
      throw error;
    }
  }

  getMusicUrl(filePath: string): string {
    return filePath; // The server serves files from the uploads directory
  }
}

export const musicService = new MusicService(); 