import { Config } from '../api-client.js';

export async function renderSettings(container) {
  container.innerHTML = `
        <div class="flex-col">
            <h2>Settings</h2>
            <div class="flex-row">
                <div style="flex:1;display:flex;flex-direction:column;gap:var(--space-6)">
                    <div class="card">
                        <h3 style="margin-bottom:var(--space-4)">Automation Delays</h3>
                        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">Random delays between posts to mimic human behavior.</p>
                        <div class="field"><label class="field-label">Min Delay (sec)</label><input type="number" class="field-input" id="cfg-min-delay"></div>
                        <div class="field"><label class="field-label">Max Delay (sec)</label><input type="number" class="field-input" id="cfg-max-delay"></div>
                    </div>
                    <div class="card">
                        <h3 style="margin-bottom:var(--space-4)">Rate Limits</h3>
                        <div class="field"><label class="field-label">Max Posts/Hour</label><input type="number" class="field-input" id="cfg-per-hour"></div>
                        <div class="field"><label class="field-label">Max Posts/Day</label><input type="number" class="field-input" id="cfg-per-day"></div>
                    </div>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;gap:var(--space-6)">
                    <div class="card" style="flex:1">
                        <h3 style="margin-bottom:var(--space-4)">Content Blacklist</h3>
                        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">Blocked phrases, one per line.</p>
                        <textarea class="field-textarea" id="cfg-blacklist" style="min-height:160px"></textarea>
                    </div>
                    <div class="card">
                        <h3 style="margin-bottom:var(--space-4)">System Info</h3>
                        <div style="font-size:var(--text-sm);display:flex;flex-direction:column;gap:var(--space-2)">
                            <div class="flex-between"><span style="color:var(--color-text-muted)">Version</span><span>v1.0.0-beta</span></div>
                            <div class="flex-between"><span style="color:var(--color-text-muted)">Instance</span><span>FBP-99X21</span></div>
                            <div class="flex-between"><span style="color:var(--color-text-muted)">License</span><span style="color:var(--color-success);font-weight:500">Active (Pro)</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:var(--space-3)">
                <button class="btn btn-primary btn-md" id="btn-save-settings">Save Settings</button>
            </div>
        </div>
  `;

  try {
    const s = await Config.get();
    
    document.getElementById('cfg-min-delay').value = s?.delay?.pagePost?.min || 8;
    document.getElementById('cfg-max-delay').value = s?.delay?.pagePost?.max || 15;
    document.getElementById('cfg-per-hour').value = s?.rateLimits?.postsPerHour || 5;
    document.getElementById('cfg-per-day').value = s?.rateLimits?.postsPerDay || 20;
    document.getElementById('cfg-blacklist').value = (s?.blacklist || []).join('\n');
    
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        try {
            await Config.update({
                delay: {
                    pagePost: {
                        min: +document.getElementById('cfg-min-delay').value,
                        max: +document.getElementById('cfg-max-delay').value
                    }
                },
                rateLimits: {
                    postsPerHour: +document.getElementById('cfg-per-hour').value,
                    postsPerDay: +document.getElementById('cfg-per-day').value
                },
                blacklist: document.getElementById('cfg-blacklist').value.split('\n').filter(Boolean)
            });
            window.Toast && window.Toast.show('Settings saved!', 'success');
        } catch(e) {
            window.Toast && window.Toast.show('Failed to save settings', 'error');
        }
    });

  } catch (error) {
    console.error(error);
  }
}
