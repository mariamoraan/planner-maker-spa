import { useTemplateStore } from "@/stores/template-store"
import './home.page.scss'
import { useNavigate } from "react-router-dom"
import { PATHS } from "@/core/routes/paths";
import { useEffect, useState } from "react";
import { get as idbGet } from 'idb-keyval';
import {CloudUpload} from 'lucide-react'

export const HomePage = () => {
    const navigate = useNavigate();
    const templatesWithoutImages = useTemplateStore(state => state.templates)
    const setCurrentTemplate = useTemplateStore(state => state.setCurrentTemplate)
    const setCurrentImage = useTemplateStore(state => state.setCurrentImage)
    const goToTemplate = (templateId: string) => {
        setCurrentTemplate(templateId)
        setCurrentImage(templates?.find(template => template.id === templateId)?.images[0]?.id ?? null)
        navigate(PATHS.editor)
    }
    const [templates, setTemplates] = useState([]);
    

      useEffect(() => {
       const loadTemplatesImages = async() => {
            const templates = []
            for(let template of templatesWithoutImages) {
                const imagesWithSrc =  await Promise.all(
                    template.images.map(async (img) => ({
                    ...img,
                    src: await idbGet(`image-${img.id}`),
                    }))
                );
                templates.push({...template, images: imagesWithSrc })
            }
            setTemplates(templates)
       }
       loadTemplatesImages();
      }, [templatesWithoutImages])

    return (
        <div className="home-page">
            <h1 className="home-page__title">Calen</h1>
            <p  className="home-page__description">Tu planner, tu lenguaje.
            Upload your own designs, define dynamic areas, and generate fully-dated planners automatically — perfectly aligned, every time.</p>
            <div className="home-page__templates">
               <h2 className="home-page__templates__title">Recientes</h2>
                <ol className="home-page__templates__list">
                    {templates?.map(template => (
                        <li 
                        key={template.id}
                        className="home-page__templates__list__li"
                        onClick={() => goToTemplate(template.id)} 
                        >
                          {
                          template?.images?.length 
                          ? <img  className="home-page__templates__list__li__img" src={template.images[0].src} /> 
                          : (
                            <div className="home-page__templates__list__li__void-img">
                                <CloudUpload />
                            </div>
                          )
                          }
                          <div className="home-page__templates__list__li__info">
                            <p className="home-page__templates__list__li__info__title">{template.name}</p>
                            <p className="home-page__templates__list__li__info__updated">Editado el {template?.updatedAt.toLocaleString('default', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                          </div>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    )
}

