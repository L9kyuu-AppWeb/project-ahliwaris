/**
 * Calculator Logic for Faraidh
 * Based on Jumhur Ulama rules + User Summary (Kakek blocks Siblings).
 */

// Format numbers as Currency (IDR)
const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
};

// Main Calculation Function
function calculateWarisan(inputs) {
    const {
        harta,
        gender, // 'suami' or 'istri'
        ayah = false,
        ibu = false,
        anakLaki = 0,
        anakPerempuan = 0,
        sdrLaki = 0,
        sdrPr = 0,
        // Extended Heirs
        kakek = false,      // Father's Father
        nenekAyah = false,  // Father's Mother
        nenekIbu = false,   // Mother's Mother
        cucuLaki = 0,       // Son's Son
        cucuPr = 0,         // Son's Daughter
        pasangan = false
    } = inputs;

    let shares = [];
    let note = "";
    let totalPortion = 0;

    // --- 1. DETERMINE HEIR STATUS (BLOCKING/HIJAB) ---

    // Direct Descendants
    const hasAnakLaki = anakLaki > 0;
    const hasAnakPerempuan = anakPerempuan > 0;
    const hasAnak = hasAnakLaki || hasAnakPerempuan;

    // Grandchildren (Cucu) - Branch of Son
    const hasCucuLaki = cucuLaki > 0;
    const hasCucuPr = cucuPr > 0;

    // Cucu Blocked by Son (Anak Laki)
    const cucuLakiBlocked = hasAnakLaki;
    const cucuPrBlockedBySon = hasAnakLaki;
    // Cucu Pr blocked by 2+ Daughters is Special: Only if no Cucu Laki exists (Lucky Kinsman).
    // If Cucu Laki exists, Cucu Pr becomes Ashabah even if 2+ Daughters exist.
    // We check this later in logic.

    // Ascendants
    const hasAyah = ayah;
    const hasIbu = ibu;

    // Grandparents
    // Kakek blocked by Ayah
    const kakekBlocked = hasAyah;

    // Nenek Rules:
    // Nenek (Ibu) blocked by Ibu.
    // Nenek (Ayah) blocked by Ibu OR Ayah.
    const nenekIbuBlocked = hasIbu;
    const nenekAyahBlocked = hasIbu || hasAyah;

    // Siblings Rules updated:
    // Blocked by: Anak Laki, Ayah, OR KAKEK (User summary: "Kakek dari ayah menghalangi saudara")
    // Also blocked by Cucu Laki? Yes, Male descendant blocks siblings.
    const siblingsBlocked = hasAnakLaki || (cucuLaki > 0 && !cucuLakiBlocked) || hasAyah || (kakek && !kakekBlocked);
    const totalSiblings = sdrLaki + sdrPr;
    const hasSiblings = totalSiblings > 0;

    // --- 2. ASSIGN FURUDH (FIXED SHARES) ---

    // A. PASANGAN (Spouse)
    let spousePortion = 0;
    // Check for *Any* descendant (Child OR Grandchild)
    const hasDescendant = hasAnak || (hasCucuLaki && !cucuLakiBlocked) || (hasCucuPr && !cucuPrBlockedBySon); // Note: CucuPr blocked by Son only here. 

    if (pasangan) {
        let portionText = "";
        if (gender === 'suami') { // Deceased: Husband
            spousePortion = hasDescendant ? 1 / 8 : 1 / 4;
            portionText = hasDescendant ? "1/8" : "1/4";
        } else { // Deceased: Wife
            spousePortion = hasDescendant ? 1 / 4 : 1 / 2;
            portionText = hasDescendant ? "1/4" : "1/2";
        }
        shares.push({
            name: gender === 'suami' ? "Istri" : "Suami",
            portion: spousePortion,
            portionText: portionText,
            type: "Faridh"
        });
        totalPortion += spousePortion;
    }

    // B. AYAH (Father)
    // 1/6 if Male Descendant exists.
    // 1/6 + Sisa if only Female Descendant exists.
    // Ashabah if No Descendant.
    const hasMaleDescendant = hasAnakLaki || (hasCucuLaki && !cucuLakiBlocked);
    const hasFemaleDescendant = hasAnakPerempuan || (hasCucuPr && !cucuPrBlockedBySon); // Simplified

    if (hasAyah) {
        if (hasMaleDescendant) {
            shares.push({ name: "Ayah", portion: 1 / 6, portionText: "1/6", type: "Faridh" });
            totalPortion += 1 / 6;
        } else if (hasFemaleDescendant) {
            shares.push({ name: "Ayah", portion: 1 / 6, portionText: "1/6 + Sisa", type: "Faridh" });
            // Will calculate remainder later
            totalPortion += 1 / 6;
        } else {
            shares.push({ name: "Ayah", portion: 0, portionText: "Sisa (Ashabah)", type: "Ashabah" });
        }
    }
    // If No Ayah, check KAKEK
    else if (kakek && !kakekBlocked) {
        if (hasMaleDescendant) {
            shares.push({ name: "Kakek", portion: 1 / 6, portionText: "1/6", type: "Faridh" });
            totalPortion += 1 / 6;
        } else if (hasFemaleDescendant) {
            shares.push({ name: "Kakek", portion: 1 / 6, portionText: "1/6 + Sisa", type: "Faridh" });
            totalPortion += 1 / 6;
        } else {
            shares.push({ name: "Kakek", portion: 0, portionText: "Sisa (Ashabah)", type: "Ashabah" });
        }
    }

    // C. IBU (Mother)
    // 1/6 if Descendants exist OR Multiple Siblings.
    // 1/3 Otherwise.
    // Umariyatain check handled simply earlier, sticking to standard logic for extensive calculator.
    if (hasIbu) {
        const motherGetsSixth = hasDescendant || totalSiblings >= 2;
        let portion = motherGetsSixth ? 1 / 6 : 1 / 3;

        // Umariyatain Minimal Check: No Descendant, No Siblings, Spouse + Father + Mother
        if (!hasDescendant && totalSiblings < 2 && pasangan && hasAyah) {
            // Just mark as special text, calc later manually if needed or stick to 1/3 of Remainder concept
            // For simplicity in this logic flow which sums strict numbers:
            // We'll treat as special type to calc value later.
            shares.push({ name: "Ibu", portion: 0, portionText: "1/3 Sisa (Umariyatain)", type: "Umariyatain" });
        } else {
            shares.push({ name: "Ibu", portion: portion, portionText: motherGetsSixth ? "1/6" : "1/3", type: "Faridh" });
            totalPortion += portion;
        }
    }

    // D. NENEK (Grandmother)
    // Shared 1/6 if eligible.
    if (!hasIbu) { // If Ibu exists, all Nenek blocked.
        let eligibleNeneks = [];
        if (nenekIbu && !nenekIbuBlocked) eligibleNeneks.push("Nenek (Ibu)");
        if (nenekAyah && !nenekAyahBlocked) eligibleNeneks.push("Nenek (Ayah)"); // Blocked by Ayah too

        if (eligibleNeneks.length > 0) {
            shares.push({
                name: `Nenek (${eligibleNeneks.join(" & ")})`,
                portion: 1 / 6,
                portionText: "1/6",
                type: "Faridh",
                count: eligibleNeneks.length
            });
            totalPortion += 1 / 6;
        }
    }

    // E. DAUGHTERS (Anak Perempuan)
    // Only if No Son (Ashabah). If Son exists -> Ashabah.
    if (hasAnakPerempuan && !hasAnakLaki) {
        let portion = (anakPerempuan === 1) ? 1 / 2 : 2 / 3;
        shares.push({
            name: `Anak Perempuan (${anakPerempuan} orang)`,
            portion: portion,
            portionText: (anakPerempuan === 1) ? "1/2" : "2/3",
            type: "Faridh",
            count: anakPerempuan
        });
        totalPortion += portion;
    }

    // F. CUCU PEREMPUAN (Granddaughter)
    // Conditions:
    // 1. Not blocked by Son.
    // 2. If blocked by 2 Daughters? -> Check Cucu Laki (Lucky Kinsman).
    if (hasCucuPr && !cucuPrBlockedBySon) {
        // If Cucu Laki exists -> Ashabah bi Ghair (always, even if 2 Daughters exist).
        if (hasCucuLaki && !cucuLakiBlocked) {
            shares.push({
                name: `Cucu Perempuan (${cucuPr} orang)`,
                portion: 0,
                portionText: "Sisa (Ashabah bil Ghair)",
                type: "AshabahCucu"
            });
        }
        else {
            // No Cucu Laki.
            // Check Daughters.
            if (anakPerempuan === 0) {
                // Like Daughter
                let portion = (cucuPr === 1) ? 1 / 2 : 2 / 3;
                shares.push({ name: `Cucu Perempuan (${cucuPr} orang)`, portion: portion, portionText: portion === 0.5 ? "1/2" : "2/3", type: "Faridh", count: cucuPr });
                totalPortion += portion;
            } else if (anakPerempuan === 1) {
                // Takamulah (Complement to 2/3) -> 1/6
                shares.push({ name: `Cucu Perempuan (${cucuPr} orang)`, portion: 1 / 6, portionText: "1/6", type: "Faridh", count: cucuPr });
                totalPortion += 1 / 6;
            } else {
                // >= 2 Daughters -> Blocked (unless Cucu Laki exists, which we checked above)
                note += "Cucu Perempuan terhalang oleh 2 anak perempuan (dan tidak ada cucu laki-laki). ";
            }
        }
    }

    // G. SISTERS (Saudara Perempuan)
    // Only if not blocked by Father, Kakek, Son, CucuLaki.
    if (hasSiblings && !siblingsBlocked) {
        // ... (Same logic as before, just ensured blocking vars are correct) ...
        // If Brother exists -> Ashabah
        if (sdrLaki > 0) {
            shares.push({ name: "Saudara/i Kandung", portion: 0, portionText: "Sisa (Ashabah)", type: "AshabahSiblings" });
        } else {
            // Sisters only
            // Ashabah ma'al ghair check: With Daughter/CucuPr?
            if (hasFemaleDescendant) {
                shares.push({ name: `Saudara Perempuan (${sdrPr} orang)`, portion: 0, portionText: "Sisa (Ashabah Ma'al Ghair)", type: "AshabahSiblings" });
            } else {
                // Kalalah
                let portion = (sdrPr === 1) ? 1 / 2 : 2 / 3;
                shares.push({ name: `Saudara Perempuan (${sdrPr} orang)`, portion: portion, portionText: portion === 0.5 ? "1/2" : "2/3", type: "Faridh", count: sdrPr });
                totalPortion += portion;
            }
        }
    } else if (hasSiblings && siblingsBlocked) {
        let blocker = "";
        if (hasAnakLaki || (hasCucuLaki && !cucuLakiBlocked)) blocker = "Keturunan Laki-laki";
        else if (hasAyah || kakek) blocker = "Ayah/Kakek";
        note += `Saudara Kandung terhalang (mahjub) oleh ${blocker}. `;
    }

    // --- 3. CALCULATE AUL ---
    let aulFactor = 1;
    if (totalPortion > 1) {
        note += "Terjadi 'Aul. ";
        aulFactor = totalPortion;
    }

    // --- 4. DISTRIBUTE VALUES ---
    let result = [];
    let currentTotalDistributed = 0;

    // Umariyatain Calc
    const umariyatainMother = shares.find(s => s.type === "Umariyatain");
    let umariyatainVal = 0;
    if (umariyatainMother) {
        let spouseShare = spousePortion * harta;
        umariyatainVal = (harta - spouseShare) * (1 / 3); // 1/3 of Remainder
        // Add Mother manually
        result.push({ name: "Ibu", shareText: "1/3 Sisa (Umariyatain)", value: umariyatainVal });
        currentTotalDistributed += umariyatainVal;
    }

    // Faridh Distribution
    shares.forEach(heir => {
        if (heir.type === "Faridh") {
            let value = (heir.portion / aulFactor) * harta;
            result.push({
                name: heir.name,
                shareText: heir.portionText,
                value: value,
                perPerson: (heir.count && heir.count > 1) ? (value / heir.count) : null
            });
            currentTotalDistributed += value;
        }
    });

    // --- 5. REMAINDER (ASHABAH) ---
    let remainder = harta - currentTotalDistributed;
    if (remainder < 0) remainder = 0;

    // Priority System for Ashabah:
    // 1. Son (+ Daughter)
    // 2. Cucu Laki (+ Cucu Pr)
    // 3. Father (if not 1/6)
    // 4. Kakek (if not 1/6)
    // 5. Siblings (Brother+Sis, or Sis w/ Daughter)

    if (hasAnakLaki) {
        // 1. Son Level
        const parts = (anakLaki * 2) + anakPerempuan;
        const onePart = remainder / parts;
        result.push({ name: `Anak Laki-laki (${anakLaki})`, shareText: "Ashabah 2:1", value: onePart * 2 * anakLaki, perPerson: onePart * 2 });
        if (anakPerempuan > 0) result.push({ name: `Anak Perempuan (${anakPerempuan})`, shareText: "Ashabah 2:1", value: onePart * 1 * anakPerempuan, perPerson: onePart });
    }
    else if (hasCucuLaki && !cucuLakiBlocked) {
        // 2. Cucu Level
        const parts = (cucuLaki * 2) + cucuPr;
        const onePart = remainder / parts;
        result.push({ name: `Cucu Laki-laki (${cucuLaki})`, shareText: "Ashabah 2:1", value: onePart * 2 * cucuLaki, perPerson: onePart * 2 });
        if (cucuPr > 0) result.push({ name: `Cucu Perempuan (${cucuPr})`, shareText: "Ashabah 2:1", value: onePart * 1 * cucuPr, perPerson: onePart });
    }
    else {
        // Check Father Ashabah
        let fatherHeir = shares.find(s => s.name === "Ayah");
        if (fatherHeir && (fatherHeir.type === "Ashabah" || fatherHeir.portionText.includes("Sisa"))) {
            // Find in result
            let resItem = result.find(r => r.name === "Ayah");
            if (resItem) { resItem.value += remainder; resItem.shareText += " + Sisa"; }
            else { result.push({ name: "Ayah", shareText: "Sisa (Ashabah)", value: remainder }); }
            remainder = 0;
        }

        // Check Kakek Ashabah
        let kakekHeir = shares.find(s => s.name === "Kakek");
        if (!fatherHeir && kakekHeir && (kakekHeir.type === "Ashabah" || kakekHeir.portionText.includes("Sisa"))) {
            let resItem = result.find(r => r.name === "Kakek");
            if (resItem) { resItem.value += remainder; resItem.shareText += " + Sisa"; }
            else { result.push({ name: "Kakek", shareText: "Sisa (Ashabah)", value: remainder }); }
            remainder = 0;
        }

        // Check Siblings
        if (remainder > 1) {
            let sibHeir = shares.find(s => s.type === "AshabahSiblings");
            if (sibHeir) {
                if (sdrLaki > 0) {
                    const parts = (sdrLaki * 2) + sdrPr;
                    const onePart = remainder / parts;
                    result.push({ name: `Saudara Laki-laki (${sdrLaki})`, shareText: "Ashabah 2:1", value: onePart * 2 * sdrLaki, perPerson: onePart * 2 });
                    if (sdrPr > 0) result.push({ name: `Saudara Perempuan (${sdrPr})`, shareText: "Ashabah 2:1", value: onePart * 1 * sdrPr, perPerson: onePart });
                } else { // Sisters only (Ashabah ma'al ghair)
                    result.push({ name: `Saudara Perempuan (${sdrPr})`, shareText: "Ashabah Ma'al Ghair", value: remainder, perPerson: remainder / sdrPr });
                }
                remainder = 0;
            }
        }
    }

    if (remainder > 100) {
        result.push({ name: "Sisa / Baitul Mal", shareText: "Sisa", value: remainder });
    }

    return { totalHarta: harta, distribution: result, note: note };
}
