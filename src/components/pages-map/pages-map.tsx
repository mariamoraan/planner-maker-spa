import { useTemplateStore } from '@/stores/template-store';
import './pages-map.scss'
import { PageThumbnail } from './page-thumbnail';
import { Plus } from 'lucide-react';
import { ImageUploader } from '../canvas/ImageUploader';

export const PagesMap = () => {
    const { getCurrentTemplate } = useTemplateStore();
    const template = getCurrentTemplate();
    const images = template?.images;

    if(!images?.length) return null;

    return (
        <ol className='pages-map'> 
            <ImageUploader customButton={<button className='pages-map__add-page-button'><Plus /></button>} />
            {images?.map(image => (
                <li className='pages-map__li' key={image.id}>
                    <PageThumbnail image={image} />
                </li>
            ))}
        </ol>
    )
}