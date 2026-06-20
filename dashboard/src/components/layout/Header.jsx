import { Save, Download, Upload } from 'lucide-react';
import { ActionButton } from '../ui/ActionButton';
import { DarkModeToggle } from '../ui/DarkModeToggle';

export default function Header({ className = '', saveLayout, exportConfig, handleImportFile }) {
	return (
		<div className={`header flex flex-wrap items-center justify-between gap-2.5 mb-5 ${className}`}>
			<img src='/favicon.png' alt='EcoTrack Logo' className='h-10 w-10' />
			<div style={{ flex: 1, marginLeft: '0.5rem'}}>
				<h1 className='header-title'>
					EcoTrack — Dashboard
				</h1>
				<p className='header-subtitle'>
					Trascina i widget per riordinare, ridimensiona dagli angoli
				</p>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<DarkModeToggle />
				<ActionButton
					icon={<Save size={16} />}
					label='Salva'
					onClick={saveLayout}
					variant='accent'
				/>
				<ActionButton
					icon={<Download size={16} />}
					label='Esporta'
					onClick={exportConfig}
				/>

				<label className='btn btn--default inline-flex items-center gap-1.5 px-3.5 py-1.75'>
					<Upload size={16} /> Importa
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
