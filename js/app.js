/**
 * Elephant Boy - Email Dashboard
 * Vue.js Application
 */

const { createApp } = Vue;

createApp({
    data() {
        const defaultFlags = { vip: false, mip: false, reply_immediately: false, reply_recommended: false, information: false, may_be_spam: false, may_be_newsletter: false };
        const rawData = window.emailData || [];
        const emails = Array.isArray(rawData)
            ? Object.fromEntries(rawData.map((email, i) => [`EMAIL_${String(i + 1).padStart(3, '0')}`, { ...email, flags: email.flags || defaultFlags }]))
            : rawData;
        return {
            emails,
            toastVisible: false,
            toastMessage: '',
            filterDefcon: null,  // null = show all, 1-5 = filter by level
            expandedEmails: {}   // track which emails are expanded by id
        };
    },

    computed: {
        /**
         * Get the highest DEFCON level across all emails
         */
        highestDefcon() {
            if (Object.keys(this.emails).length === 0) return 1;

            const defcons = Object.values(this.emails).map(email => email.defcon || 1);
            return Math.max(...defcons);
        },

        /**
         * Get the global status icon based on highest DEFCON and oldest email
         */
        globalStatusIcon() {
            if (this.highestDefcon >= 4) {
                return '☢️'; // Mushroom cloud / nuclear for critical
            }

            // Find the oldest non-critical email
            const ages = Object.values(this.emails)
                .filter(email => email.defcon < 4)
                .map(email => this.getAgeInDays(email.age));

            if (ages.length === 0) return '☢️';

            const maxAge = Math.max(...ages);

            if (maxAge <= 0) return '🌱'; // Fresh - today
            if (maxAge <= 3) return '🍎'; // Ripe - up to 3 days
            return '🦴'; // Ancient - older than 3 days
        },

        /**
         * Get filtered emails based on selected DEFCON level
         */
        filteredEmails() {
            if (this.filterDefcon === null) {
                return this.emails;
            }
            const filtered = {};
            for (const [id, email] of Object.entries(this.emails)) {
                if (email.defcon === this.filterDefcon) {
                    filtered[id] = email;
                }
            }
            return filtered;
        },

        /**
         * Get the global status text
         */
        globalStatusText() {
            if (this.highestDefcon >= 4) {
                return 'KRITISCH - Sofortige Aktion erforderlich!';
            }

            const ages = Object.values(this.emails)
                .filter(email => email.defcon < 4)
                .map(email => this.getAgeInDays(email.age));

            if (ages.length === 0) return 'Kritischer Status';

            const maxAge = Math.max(...ages);

            if (maxAge <= 0) return 'Frisch - Alle E-Mails von heute';
            if (maxAge <= 3) return 'Reif - E-Mails bis zu 3 Tagen alt';
            return 'Antik - E-Mails älter als 3 Tage';
        }
    },

    methods: {
        /**
         * Toggle email card expansion
         */
        toggleExpand(id) {
            this.expandedEmails[id] = !this.expandedEmails[id];
        },

        /**
         * Check if email is expanded
         */
        isExpanded(id) {
            return !!this.expandedEmails[id];
        },

        /**
         * Toggle DEFCON filter - click same level again to clear
         */
        toggleDefconFilter(level) {
            if (this.filterDefcon === level) {
                this.filterDefcon = null;
                this.showToast('Filter aufgehoben');
            } else {
                this.filterDefcon = level;
                const count = Object.values(this.emails).filter(e => e.defcon === level).length;
                this.showToast(`DEFCON ${level} Filter: ${count} E-Mail${count !== 1 ? 's' : ''}`);
            }
        },

        /**
         * Parse age string and return days as number
         */
        getAgeInDays(age) {
            if (typeof age === 'number') return age;
            if (!age) return 0;

            // Parse strings like "2 days", "1 day", "today", "3 Tage", etc.
            const ageStr = String(age).toLowerCase();

            if (ageStr.includes('today') || ageStr.includes('heute') || ageStr === '0') {
                return 0;
            }

            const match = ageStr.match(/(\d+)/);
            if (match) {
                return parseInt(match[1], 10);
            }

            return 0;
        },

        /**
         * Get age badge CSS class based on email age and defcon
         */
        getAgeBadgeClass(email) {
            const defcon = email.defcon || 1;

            // If DEFCON >= 4, always show critical
            if (defcon >= 4) {
                return 'critical';
            }

            const days = this.getAgeInDays(email.age);

            if (days <= 0) return 'fresh';
            if (days <= 3) return 'ripe';
            return 'ancient';
        },

        /**
         * Get age icon based on email age and defcon
         */
        getAgeIcon(email) {
            const defcon = email.defcon || 1;

            // If DEFCON >= 4, show mushroom cloud
            if (defcon >= 4) {
                return '☢️';
            }

            const days = this.getAgeInDays(email.age);

            if (days <= 0) return '🌱'; // Fresh
            if (days <= 3) return '🍎'; // Ripe
            return '🦴'; // Ancient
        },

        /**
         * Get age label text
         */
        getAgeLabel(email) {
            const defcon = email.defcon || 1;

            if (defcon >= 4) {
                return 'KRITISCH';
            }

            const days = this.getAgeInDays(email.age);

            if (days <= 0) return 'Frisch';
            if (days === 1) return '1 Tag';
            if (days <= 3) return `${days} Tage`;
            return `${days} Tage (Alt)`;
        },

        /**
         * Copy text to clipboard
         */
        async copyToClipboard(text, event) {
            try {
                await navigator.clipboard.writeText(text);
                this.showToast('In Zwischenablage kopiert!');

                // Visual feedback on button
                if (event && event.target) {
                    const btn = event.target;
                    btn.classList.add('copied');
                    setTimeout(() => btn.classList.remove('copied'), 1000);
                }
            } catch (err) {
                // Fallback for older browsers or Cordova
                this.fallbackCopyToClipboard(text);
                this.showToast('Kopiert!');
            }
        },

        /**
         * Fallback copy method for environments without clipboard API
         */
        fallbackCopyToClipboard(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }

            document.body.removeChild(textArea);
        },

        /**
         * Copy all actionable items for Asana (one per line, no formatting)
         */
        async copyAllActions(email, event) {
            if (!email.actionable_items || email.actionable_items.length === 0) {
                return;
            }

            // Flatten all items into a single array, one per line
            const allItems = email.actionable_items
                .flatMap(category => category.items || [])
                .join('\n');

            try {
                await navigator.clipboard.writeText(allItems);
                this.showToast('Alle Aktionen kopiert (Asana-Format)');

                if (event && event.target) {
                    const btn = event.target;
                    btn.classList.add('copied');
                    setTimeout(() => btn.classList.remove('copied'), 1000);
                }
            } catch (err) {
                this.fallbackCopyToClipboard(allItems);
                this.showToast('Alle Aktionen kopiert!');
            }
        },

        /**
         * Show toast notification
         */
        showToast(message) {
            this.toastMessage = message;
            this.toastVisible = true;

            setTimeout(() => {
                this.toastVisible = false;
            }, 2000);
        }
    },

    mounted() {
        console.log('Elephant Boy Dashboard initialized');
        console.log(`Loaded ${Object.keys(this.emails).length} emails`);
        console.log(`Highest DEFCON level: ${this.highestDefcon}`);
    }
}).mount('#app');
