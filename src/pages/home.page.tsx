import { useTemplateStore } from "@/stores/template-store"
import './home.page.scss'
import { useNavigate } from "react-router-dom"
import { PATHS } from "@/core/routes/paths";
import { useEffect, useState } from "react";
import { get as idbGet } from 'idb-keyval';
import {CloudUpload, Plus} from 'lucide-react'
import { AddTemplateButton } from "@/components/add-template-button/add-template-button";
import { AnimatedTagline } from "@/components/animated-tagline/animated-tagline";

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
            <div className="home-page__sidebar">
                <AddTemplateButton customButton={<Plus className="home-page__sidebar__add-button" />} />
            </div>
            <main className="home-page__main">
                <div className="home-page__main__header">
                    <AnimatedTagline words={["design", "dates", "planner"]} />
                    <p  className="home-page__main__header__description">
                    Upload your own designs, define dynamic date areas, and generate print-ready planners automatically — perfectly aligned, every time.
                    </p>
                    <AddTemplateButton customButton={<button className="home-page__main__header__cta">Start a new project</button>} />
                </div>
                <div className="home-page__main__templates">
                <h2 className="home-page__main__templates__title">Recientes</h2>
                    <ol className="home-page__main__templates__list">
                        {templates?.map(template => (
                            <li 
                            key={template.id}
                            className="home-page__main__templates__list__li"
                            onClick={() => goToTemplate(template.id)} 
                            >
                            {
                            template?.images?.length 
                            ? <img  className="home-page__main__templates__list__li__img" src={template.images[0].src} /> 
                            : (
                                <div className="home-page__main__templates__list__li__void-img">
                                    <CloudUpload />
                                </div>
                            )
                            }
                            <div className="home-page__main__templates__list__li__info">
                                <p className="home-page__main__templates__list__li__info__title">{template.name}</p>
                                <p className="home-page__main__templates__list__li__info__updated">Editado el {template?.updatedAt.toLocaleString('default', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                            </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </main>
        </div>
    )
}

