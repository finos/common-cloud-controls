import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export const CONTROLS_BACKUP_NAME = 'controls.yaml.backup';

/**
 * True when controls.yaml uses a top-level `controls` list (service-native controls)
 * and no `control-families` block. Gemara / delivery-toolkit only ingests control-families.
 */
export function shouldNormalizeFlatControls(doc: Record<string, unknown>): boolean {
    const controls = doc.controls;
    const families = doc['control-families'];
    const hasFlatControls = Array.isArray(controls) && controls.length > 0;
    const hasControlFamilies = Array.isArray(families) && families.length > 0;
    return hasFlatControls && !hasControlFamilies;
}

function familyDisplayTitle(familyId: string): string {
    const last = familyId.split('.').pop() || familyId;
    if (last.toUpperCase() === 'IAM') {
        return 'IAM';
    }
    if (!last) {
        return familyId;
    }
    return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
}

/**
 * Converts flat `controls` (each with `family` or `group`) into `control-families` and drops `controls`.
 * Preserves `imported-controls` and any other top-level keys except `controls`.
 */
export function flatControlsDocToFamilies(doc: Record<string, unknown>): Record<string, unknown> {
    const flat = doc.controls as Array<Record<string, unknown>>;
    const byFamily = new Map<string, Record<string, unknown>[]>();

    for (const ctrl of flat) {
        const fam = typeof ctrl.family === 'string' ? ctrl.family : (ctrl.group as string | undefined);
        if (typeof fam !== 'string' || !fam.trim()) {
            const id = typeof ctrl.id === 'string' ? ctrl.id : '(unknown id)';
            throw new Error(`controls.yaml: control "${id}" must have a non-empty string "family" for flat format`);
        }
        if (!byFamily.has(fam)) {
            byFamily.set(fam, []);
        }
        const { family: _dropFamily, group: _dropGroup, ...rest } = ctrl;
        byFamily.get(fam)!.push(rest);
    }

    const controlFamilies: Record<string, unknown>[] = [];
    const orderedFamilyIds = [...byFamily.keys()].sort();
    for (const familyId of orderedFamilyIds) {
        controlFamilies.push({
            id: familyId,
            title: familyDisplayTitle(familyId),
            description: '',
            controls: byFamily.get(familyId),
        });
    }

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(doc)) {
        if (key === 'controls') {
            continue;
        }
        out[key] = doc[key];
    }
    out['control-families'] = controlFamilies;
    return out;
}

/**
 * If needed, rewrites controls.yaml to control-families format and backs up the original.
 */
export function normalizeControlsYamlInPlace(catalogPath: string): boolean {
    const controlsPath = path.join(catalogPath, 'controls.yaml');
    const backupPath = path.join(catalogPath, CONTROLS_BACKUP_NAME);

    if (!fs.existsSync(controlsPath)) {
        return false;
    }

    const raw = fs.readFileSync(controlsPath, 'utf8');
    const doc = yaml.load(raw) as Record<string, unknown>;
    if (!doc || typeof doc !== 'object') {
        return false;
    }

    if (!shouldNormalizeFlatControls(doc)) {
        return false;
    }

    if (fs.existsSync(backupPath)) {
        throw new Error(`Refusing to overwrite stale backup: ${backupPath}. Remove it and retry.`);
    }

    const normalized = flatControlsDocToFamilies(doc);
    const outYaml = yaml.dump(normalized, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
    });

    fs.writeFileSync(backupPath, raw, 'utf8');
    try {
        fs.writeFileSync(controlsPath, outYaml, 'utf8');
    } catch (writeErr) {
        try {
            fs.writeFileSync(controlsPath, raw, 'utf8');
            fs.unlinkSync(backupPath);
        } catch {
            /* best-effort restore */
        }
        throw writeErr;
    }
    console.log(`  📝 Normalized flat controls.yaml -> control-families (backup: ${CONTROLS_BACKUP_NAME})`);
    return true;
}

/**
 * Restores original controls.yaml after a normalization backup.
 */
export function restoreControlsYamlBackup(catalogPath: string): void {
    const controlsPath = path.join(catalogPath, 'controls.yaml');
    const backupPath = path.join(catalogPath, CONTROLS_BACKUP_NAME);

    if (!fs.existsSync(backupPath)) {
        return;
    }
    try {
        const original = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(controlsPath, original, 'utf8');
        fs.unlinkSync(backupPath);
        console.log(`  🧹 Restored original controls.yaml`);
    } catch (error) {
        console.log(
            `  ⚠️  Failed to restore controls.yaml from backup: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
