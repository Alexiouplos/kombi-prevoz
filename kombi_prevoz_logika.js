// --- POPUNJAVANJE & SCROLL UTICAJI NA NAVBAR ---
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- MOBILNI MENI TOGGLE ---
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const icon = navToggle.querySelector('i');
    if (navMenu.classList.contains('active')) {
        icon.className = 'fa-solid fa-xmark';
    } else {
        icon.className = 'fa-solid fa-bars';
    }
});

// Zatvori mobilni meni na klik linka
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.querySelector('i').className = 'fa-solid fa-bars';
    });
});

// --- SCROLL REVEAL EFEKAT ---
const revealElements = document.querySelectorAll('.scroll-reveal');

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// --- MODALNI PROZOR (KONTAKT KARTICA) ---
const openModalBtn = document.getElementById('openContactModal');
const closeModalBtn = document.getElementById('closeContactModal');
const contactModal = document.getElementById('contactModal');

openModalBtn.addEventListener('click', () => {
    contactModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Onemogući skrolovanje u pozadini
});

closeModalBtn.addEventListener('click', () => {
    contactModal.classList.remove('active');
    document.body.style.overflow = '';
});

// Zatvaranje modala klikom van kartice
contactModal.addEventListener('click', (e) => {
    if (e.target === contactModal) {
        contactModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// --- KONTAKT FORMA (BEZ BACKEND-A) ---
const contactForm = document.getElementById('contactForm');
const formSuccessMessage = document.getElementById('formSuccessMessage');
const btnFormSubmit = document.getElementById('btnFormSubmit');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Vizuelni utisak slanja
    btnFormSubmit.disabled = true;
    btnFormSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Slanje upita...';
    
    // Simulacija slanja na server
    setTimeout(() => {
        contactForm.style.display = 'none';
        formSuccessMessage.style.display = 'block';
        
        // Resetovanje forme
        contactForm.reset();
    }, 1500);
});

// ==========================================
// ✨ GEMINI API INTEGRACIJA (PLANER RUTE)
// ==========================================
const apiKey = ""; // Prazan string prema uputstvu, API ključ se ubacuje u runtime okruženju

async function pozoviGeminiSaRetry(prompt, systemPrompt, maxRetries = 5) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    polazak: { type: "STRING" },
                    dolazak: { type: "STRING" },
                    udaljenost: { type: "STRING" },
                    vreme: { type: "STRING" },
                    itinerer: { type: "STRING" },
                    savet: { type: "STRING" },
                    napomenaZaFormu: { type: "STRING" }
                },
                required: ["polazak", "dolazak", "udaljenost", "vreme", "itinerer", "savet", "napomenaZaFormu"]
            }
        }
    };

    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const data = await response.json();
                return JSON.parse(data.candidates[0].content.parts[0].text);
            }
        } catch (error) {
            // Tiho preskakanje grešaka radi implementacije retry logike
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Eksponencijalno povećanje vremena (1s, 2s, 4s, 8s, 16s)
    }
    throw new Error("Sistem privremeno nije u mogućnosti da obradi Vaš zahtev. Unesite plan putovanja ručno u kontakt formu.");
}

const btnGenerateAI = document.getElementById('btnGenerateAI');
const aiPromptInput = document.getElementById('aiPrompt');
const aiPlaceholder = document.getElementById('aiPlaceholder');
const aiResult = document.getElementById('aiResult');

// Rezultati iz API-ja
const aiDistance = document.getElementById('aiDistance');
const aiDuration = document.getElementById('aiDuration');
const aiItineraryText = document.getElementById('aiItineraryText');
const aiTip = document.getElementById('aiTip');
const btnApplyAI = document.getElementById('btnApplyAI');

let globalniAIRezultat = null;

btnGenerateAI.addEventListener('click', async () => {
    const prompt = aiPromptInput.value.trim();
    if (!prompt) {
        alert("Molimo Vas da opišete Vašu željenu rutu.");
        return;
    }

    btnGenerateAI.disabled = true;
    btnGenerateAI.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generisanje plana rute...';
    
    const systemPrompt = `Vi ste stručni koordinator i planer rute za transportnu kompaniju Dragašević Prevoz. Korisnik opisuje svoj putnički plan. Analizirajte polazak, dolazak i ponudite plan vožnje prilagođen kombiju Renault Master od 16 mesta (kombi se kreće neznatno sporije od automobila radi bezbednosti). Izračunajte udaljenost u km, ukupno vreme vožnje i ponudite itinerer sa mestima za pauze (pauze su preporučene na svaka 2 sata vožnje). Ponudite i jedan koristan savet za to specifično putovanje. Odgovor mora biti na srpskom jeziku (latinica), isključivo u validnom JSON formatu.`;

    try {
        const rezultat = await pozoviGeminiSaRetry(prompt, systemPrompt);
        globalniAIRezultat = rezultat;

        // Popuni polja u rezultatu rute
        aiDistance.textContent = rezultat.udaljenost;
        aiDuration.textContent = rezultat.vreme;
        aiItineraryText.innerHTML = rezultat.itinerer.replace(/\n/g, '<br>');
        aiTip.textContent = rezultat.savet;

        // Prebaci vidljivost sa placeholder-a na rezultat
        aiPlaceholder.style.display = 'none';
        aiResult.style.display = 'flex';
    } catch (err) {
        alert(err.message);
    } finally {
        btnGenerateAI.disabled = false;
        btnGenerateAI.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generiši Plan Rute';
    }
});

// Prenos generisanih podataka u kontakt formu
btnApplyAI.addEventListener('click', () => {
    if (!globalniAIRezultat) return;

    document.getElementById('formPolazak').value = globalniAIRezultat.polazak;
    document.getElementById('formDolazak').value = globalniAIRezultat.dolazak;
    document.getElementById('formPoruka').value = globalniAIRezultat.napomenaZaFormu;

    // Skroluj glatko do kontakt forme
    document.getElementById('kontakt').scrollIntoView({ behavior: 'smooth' });
});