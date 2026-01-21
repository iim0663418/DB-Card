/**
 * Social Link Validation Integration
 * Integrates URL validation into form inputs
 */

// Add social link validation to form inputs
document.addEventListener('DOMContentLoaded', () => {
    const socialFields = [
        'social_github',
        'social_linkedin', 
        'social_facebook',
        'social_instagram',
        'social_twitter',
        'social_youtube'
    ];

    socialFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (!input) return;

        // Add validation on blur
        input.addEventListener('blur', () => {
            const value = input.value.trim();
            const error = getSocialLinkError(value);
            
            // Remove existing error
            const existingError = input.parentElement.querySelector('.social-link-error');
            if (existingError) {
                existingError.remove();
            }

            if (error) {
                // Add error message
                input.classList.add('border-red-500');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'social-link-error text-xs text-red-600 mt-1';
                errorDiv.textContent = error;
                input.parentElement.appendChild(errorDiv);
            } else {
                input.classList.remove('border-red-500');
            }
        });

        // Clear error on input
        input.addEventListener('input', () => {
            input.classList.remove('border-red-500');
            const existingError = input.parentElement.querySelector('.social-link-error');
            if (existingError) {
                existingError.remove();
            }
        });
    });
});

/**
 * Validate all social links before form submission
 * Call this function before submitting card data
 * @returns {boolean} - True if all valid, false if errors found
 */
function validateAllSocialLinksBeforeSubmit() {
    const socialFields = [
        'social_github',
        'social_linkedin',
        'social_facebook',
        'social_instagram',
        'social_twitter',
        'social_youtube'
    ];

    let hasError = false;
    const errors = [];

    socialFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (!input) return;

        const value = input.value.trim();
        const error = getSocialLinkError(value);

        if (error) {
            hasError = true;
            const platform = fieldId.replace('social_', '');
            errors.push(`${platform}: ${error}`);
            input.classList.add('border-red-500');
            
            // Add error message if not already present
            const existingError = input.parentElement.querySelector('.social-link-error');
            if (!existingError) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'social-link-error text-xs text-red-600 mt-1';
                errorDiv.textContent = error;
                input.parentElement.appendChild(errorDiv);
            }
        }
    });

    if (hasError && typeof showToast === 'function') {
        showToast('請修正社群連結錯誤', 'error');
    }

    return !hasError;
}
