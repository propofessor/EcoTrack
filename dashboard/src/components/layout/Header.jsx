import { Save, Download, Upload } from 'lucide-react';
import { ActionButton } from '../ui/ActionButton';
import { DarkModeToggle } from '../ui/DarkModeToggle';

export default function Header({ saveLayout, exportConfig, handleImportFile }) {
	return (
		<div className='flex flex-wrap items-center justify-between gap-2.5 mb-5'>
			<div>
				<h1 className='text-[1.375rem] font-bold text-(--text-primary)'>
					🌱 EcoTrack — Dashboard Comune
				</h1>
				<p className='text-[0.813rem] text-(--text-secondary)'>
					Trascina i widget per riordinare, ridimensiona dagli angoli
				</p>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<DarkModeToggle />
				<ActionButton
					icon={<Save size={14} />}
					label='Salva'
					onClick={saveLayout}
					variant='accent'
				/>
				<ActionButton
					icon={<Download size={14} />}
					label='Esporta'
					onClick={exportConfig}
				/>

				{/* Usiamo la classe personalizzata definita nel CSS globale */}
				<label className='btn-import'>
					<Upload size={14} /> Importa
					<input
						type='file'
						accept='.json'
						onChange={handleImportFile}
						className='hidden'
					/>
				</label>
			</div>
		</div>
	);
}
