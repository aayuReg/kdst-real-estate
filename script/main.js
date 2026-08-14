// ============================================================
// KDST Real Estate — site-wide behaviour
// ============================================================

// ---- Dynamic copyright year -------------------------------
document.querySelectorAll('#copyrightYear').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// ---- Mobile Navigation Toggle ------------------------------
// The same #navMenu element is the always-visible horizontal nav on
// desktop and the slide-in dropdown on mobile (see the max-width:767px
// block in style/layout.css). When it's "closed" on mobile it's only
// moved off-screen (left: -100%) — its links are still in the page and
// still focusable, which lets a keyboard/screen-reader user tab into
// links that are invisible off-canvas. We fix that with `inert`, but
// only while the mobile breakpoint is actually active; on desktop the
// menu must stay fully interactive.
document.addEventListener('DOMContentLoaded', function () {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    const mobileMenuQuery = window.matchMedia('(max-width: 767px)');

    function setMenuOpen(isOpen) {
      navMenu.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      syncInert();
    }

    function syncInert() {
      const shouldBeInert = mobileMenuQuery.matches && !navMenu.classList.contains('active');
      if (shouldBeInert) {
        navMenu.setAttribute('inert', '');
      } else {
        navMenu.removeAttribute('inert');
      }
    }

    function closeAndReturnFocus() {
      if (!navMenu.classList.contains('active')) return;
      setMenuOpen(false);
      navToggle.focus();
    }

    syncInert();
    mobileMenuQuery.addEventListener('change', syncInert);

    navToggle.addEventListener('click', function () {
      setMenuOpen(!navMenu.classList.contains('active'));
    });

    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach((link) => {
      link.addEventListener('click', function () {
        // No focus() here: clicking a link navigates away, so
        // returning focus to the toggle would be pointless/jarring.
        setMenuOpen(false);
      });
    });

    document.addEventListener('click', function (event) {
      if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAndReturnFocus();
      }
    });
  }
});

// Respect the visitor's OS/browser reduced-motion preference for
// scripted scrolling. General transitions/animations are handled
// site-wide in style/base.css; this covers scrollIntoView/scrollTo
// calls below, which take an explicit behavior option that CSS alone
// can't override.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Smooth Scrolling for Anchor Links ----------------------
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });
});

// ---- Contact Form: Validation + Submission -------------------
// Once you sign up at https://formspree.io (or Web3Forms) and create a
// form, paste the real endpoint below. Until then, the form falls back
// to opening the visitor's email client with the message pre-filled,
// so no inquiry is ever silently lost.
const FORM_ENDPOINT = 'https://formspree.io/f/mgawzzna';
const FALLBACK_EMAIL = 'info@kdst-realestate.com';
const isFormEndpointConfigured = !FORM_ENDPOINT.includes('YOUR_FORM_ID');

// Pre-fill "Property Interest" from a query string, e.g.
// contact.html?property=Residential%20Land%20-%20Lokanthali
(function prefillFromQueryString() {
  const params = new URLSearchParams(window.location.search);
  const propertyTitle = params.get('property');
  const messageField = document.getElementById('message');
  if (propertyTitle && messageField && !messageField.value) {
    messageField.value = `Hi, I'm interested in "${propertyTitle}". Please share more details.`;
  }
})();

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !email || !phone || !message) {
      showAlert('Please fill in all fields', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Please enter a valid email address', 'error');
      return;
    }

    const phoneRegex = /^(\+977)?[9][0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      showAlert('Please enter a valid Nepal mobile number (e.g. 98XXXXXXXX)', 'error');
      return;
    }

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Fallback: endpoint isn't configured yet, so open a pre-filled
    // email instead of pretending the message was sent.
    if (!isFormEndpointConfigured) {
      const propertyType = document.getElementById('propertyType')?.value || 'Not specified';
      const location = document.getElementById('location')?.value || 'Not specified';
      const subject = encodeURIComponent(`Website inquiry from ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nProperty Interest: ${propertyType}\nPreferred Location: ${location}\n\nMessage:\n${message}`
      );
      window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
      showAlert('Opening your email app with this message ready to send. Please hit send there to complete your inquiry — or call/WhatsApp us instead.', 'info');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }

    try {
      const formData = new FormData(contactForm);
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        showAlert('Thank you! We will contact you soon.', 'success');
        contactForm.reset();
      } else {
        showAlert('Something went wrong sending your message. Please call or WhatsApp us instead.', 'error');
      }
    } catch (err) {
      showAlert('Could not send your message. Please check your connection or call us instead.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Alert Function
function showAlert(message, type) {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.parentNode.querySelectorAll('.alert').forEach((el) => el.remove());

  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.setAttribute('role', 'status');
  alertDiv.textContent = message;

  form.parentNode.insertBefore(alertDiv, form);

  setTimeout(() => {
    alertDiv.remove();
  }, 6000);
}

// NOTE: Property search/filter logic lives in script/properties-render.js,
// since it needs to run against dynamically-loaded property data.

// ---- Scroll to Top Button ------------------------------------
const scrollTopBtn = document.createElement('button');
scrollTopBtn.innerHTML = '&uarr;';
scrollTopBtn.className = 'scroll-top-btn';
scrollTopBtn.type = 'button';
scrollTopBtn.setAttribute('aria-label', 'Scroll back to top');

document.body.appendChild(scrollTopBtn);

window.addEventListener('scroll', function () {
  scrollTopBtn.classList.toggle('visible', window.pageYOffset > 300);
});

scrollTopBtn.addEventListener('click', function () {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

// ---- Sticky Social Float Buttons ------------------------------------
// Update these with the client's real profile URLs/number. WhatsApp is
// wired to a real number already; Facebook and Twitter/X are placeholders
// (marked below) until those pages exist. Buttons for unconfigured
// placeholder URLs are filtered out below (audit F02) so visitors never
// land on a fake/broken social profile.
const WHATSAPP_NUMBER = '9779851119368';
const FACEBOOK_URL = 'https://facebook.com/YOUR_FACEBOOK_PAGE'; // TODO: replace with real page URL
const TWITTER_URL = 'https://x.com/YOUR_TWITTER_HANDLE'; // TODO: replace with real profile URL

const PLACEHOLDER_MARKERS = ['YOUR_FACEBOOK_PAGE', 'YOUR_TWITTER_HANDLE'];
function isConfiguredUrl(url) {
  return !PLACEHOLDER_MARKERS.some((marker) => url.includes(marker));
}

const socialLinks = [
  {
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi KDST, I have a question about a property.')}`,
    className: 'social-float-btn whatsapp',
    label: 'Chat with KDST Real Estate on WhatsApp',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C11 9 10.6 8 10.4 7.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3Z"/><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>',
  },
  {
    href: FACEBOOK_URL,
    className: 'social-float-btn facebook',
    label: 'KDST Real Estate on Facebook',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.5-1.5h1.6V4.2C15.9 4.1 15 4 14 4c-2.4 0-4 1.5-4 4.1v2.2H7.4v3H10V21h3.5Z"/></svg>',
  },
  {
    href: TWITTER_URL,
    className: 'social-float-btn twitter',
    label: 'KDST Real Estate on Twitter/X',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.9 2H22l-7.6 8.7L23.3 22H16.9l-5-6.5L6.1 22H3l8.1-9.3L2.6 2h6.6l4.5 6L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z"/></svg>',
  },
].filter(({ href }) => isConfiguredUrl(href));

const socialContainer = document.createElement('div');
socialContainer.className = 'social-float-container';

socialLinks.forEach(({ href, className, label, svg }) => {
  const btn = document.createElement('a');
  btn.href = href;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.className = className;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = svg;
  socialContainer.appendChild(btn);
});

document.body.appendChild(socialContainer);

// ---- Reveal-on-scroll animation --------------------------------
// Exposed as window.KDST.observeReveal(elements) so pages that inject
// content dynamically (e.g. properties-render.js) can register their
// new elements for the same fade/slide-in treatment once they exist,
// instead of racing DOMContentLoaded.
function observeReveal(elements) {
  if (!elements || !elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => {
    el.classList.add('reveal-init');
    observer.observe(el);
  });
}

window.KDST = window.KDST || {};
window.KDST.observeReveal = observeReveal;

function initPageAnimations() {
  observeReveal(document.querySelectorAll('.card, .stat-item'));
  // .property-card elements (if any) are injected later by
  // properties-render.js, which calls observeReveal itself once
  // the cards exist in the DOM.
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageAnimations);
} else {
  initPageAnimations();
}
