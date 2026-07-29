import { t } from '@/core/i18n';

export class CustomDialog {
  private static container: HTMLDivElement | null = null;

  private static init() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'custom-dialog-container';
    
    // Base styles for the overlay
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(5px)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000',
      opacity: '0',
      transition: 'opacity 0.2s ease',
    });

    document.body.appendChild(this.container);

    // Global CSS for dialog components if not already injected
    if (!document.getElementById('custom-dialog-style')) {
      const style = document.createElement('style');
      style.id = 'custom-dialog-style';
      style.innerHTML = `
        .custom-dialog-box {
          background: rgba(255, 240, 245, 0.95);
          border: 2px solid #ffb6c1;
          border-radius: 20px;
          padding: 24px 32px;
          box-shadow: 0 10px 40px rgba(233, 69, 96, 0.2);
          text-align: center;
          min-width: 320px;
          max-width: 90vw;
          transform: scale(0.9);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          color: #555;
          font-family: inherit;
        }
        .custom-dialog-message {
          font-size: 1.05rem;
          margin-bottom: 24px;
          line-height: 1.5;
          font-weight: 600;
        }
        .custom-dialog-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .custom-dialog-btn {
          padding: 10px 24px;
          border-radius: 12px;
          border: none;
          font-weight: bold;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
          font-family: inherit;
        }
        .custom-dialog-btn:hover {
          transform: translateY(-2px);
        }
        .custom-dialog-btn:active {
          transform: translateY(0);
        }
        .btn-confirm {
          background: #3f51b5;
          color: white;
          box-shadow: 0 4px 15px rgba(63, 81, 181, 0.3);
        }
        .btn-confirm:hover {
          background: #303f9f;
          box-shadow: 0 6px 20px rgba(63, 81, 181, 0.4);
        }
        .btn-cancel {
          background: #e8eaf6;
          color: #3f51b5;
          border: 2px solid #7986cb;
          padding: 8px 22px; /* adjust for border */
        }
        .btn-cancel:hover {
          background: #c5cae9;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private static show(message: string, isConfirm: boolean): Promise<boolean> {
    this.init();
    return new Promise((resolve) => {
      if (!this.container) return;

      const okText = t('btn.ok');
      const cancelText = t('btn.cancel');

      this.container.innerHTML = `
        <div class="custom-dialog-box" id="custom-dialog-box">
          <div class="custom-dialog-message">${message}</div>
          <div class="custom-dialog-buttons">
            ${isConfirm ? `<button class="custom-dialog-btn btn-cancel" id="custom-dialog-cancel">${cancelText}</button>` : ''}
            <button class="custom-dialog-btn btn-confirm" id="custom-dialog-ok">${okText}</button>
          </div>
        </div>
      `;

      this.container.style.display = 'flex';
      
      // Trigger reflow for animation
      void this.container.offsetWidth; 
      
      this.container.style.opacity = '1';
      const box = document.getElementById('custom-dialog-box');
      if (box) box.style.transform = 'scale(1)';

      const cleanup = () => {
        if (!this.container) return;
        this.container.style.opacity = '0';
        if (box) box.style.transform = 'scale(0.9)';
        setTimeout(() => {
          if (this.container) this.container.style.display = 'none';
        }, 200);
      };

      document.getElementById('custom-dialog-ok')?.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      if (isConfirm) {
        document.getElementById('custom-dialog-cancel')?.addEventListener('click', () => {
          cleanup();
          resolve(false);
        });
      }
    });
  }

  static async alert(message: string): Promise<void> {
    await this.show(message, false);
  }

  static async confirm(message: string): Promise<boolean> {
    return await this.show(message, true);
  }
}
