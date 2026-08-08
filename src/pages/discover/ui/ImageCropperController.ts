import Cropper from 'cropperjs';

export class ImageCropperController {
    static cropper: Cropper | null = null;
    static croppedBlob: Blob | null = null;

    static setup() {
        const iconInput = document.getElementById('upload-icon') as HTMLInputElement;
        const cropperModal = document.getElementById('cropper-modal');
        const cropperImage = document.getElementById('cropper-image') as HTMLImageElement;
        const btnCancelCrop = document.getElementById('btn-cancel-crop');
        const btnApplyCrop = document.getElementById('btn-apply-crop');
        const iconPreviewImg = document.getElementById('icon-preview-img') as HTMLImageElement;
        const iconPreviewText = document.getElementById('icon-preview-text');

        if (!iconInput) return;

        iconInput.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result && cropperModal && cropperImage) {
                    cropperImage.src = event.target.result as string;
                    cropperModal.style.display = 'flex';

                    if (this.cropper) this.cropper.destroy();
                    this.cropper = new Cropper(cropperImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 1,
                        restore: false,
                        guides: true,
                        center: true,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false,
                    });
                }
            };
            reader.readAsDataURL(file);
        });

        btnCancelCrop?.addEventListener('click', (e) => {
            e.preventDefault();
            if (cropperModal) cropperModal.style.display = 'none';
            if (this.cropper) {
                this.cropper.destroy();
                this.cropper = null;
            }
            iconInput.value = '';
        });

        btnApplyCrop?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.cropper) return;

            const canvas = this.cropper.getCroppedCanvas({
                width: 256,
                height: 256,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    this.croppedBlob = blob;
                    const url = URL.createObjectURL(blob);
                    iconPreviewImg.src = url;
                    iconPreviewImg.style.display = 'block';
                    if (iconPreviewText) iconPreviewText.style.display = 'none';
                    
                    const iconContainer = document.getElementById('icon-preview-container');
                    if (iconContainer) iconContainer.classList.add('has-image');

                    if (cropperModal) cropperModal.style.display = 'none';
                    if (this.cropper) {
                        this.cropper.destroy();
                        this.cropper = null;
                    }
                }
            }, 'image/jpeg', 0.9);
        });
    }

    static getCroppedBlob() {
        return this.croppedBlob;
    }

    static setCroppedBlob(blob: Blob | null) {
        this.croppedBlob = blob;
    }

    static reset() {
        this.croppedBlob = null;
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
    }
}
