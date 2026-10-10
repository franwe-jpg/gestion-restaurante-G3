# **Análisis de riesgos: correcciones del TP5 y guía para la ISFPP**
 
## **1\. Correcciones de fondo**
 
**1.1 La línea de corte se justificó con la restricción equivocada.**
 
Justificamos el corte con la falta de presupuesto de capacitación. Esa restricción no tiene relación con cuántos riesgos se pueden seguir. Lo que limita la cantidad de riesgos gestionados activamente es la **capacidad del equipo**: personas, dedicación y duración del proyecto. En el TP5 eran 4 personas, 2 de ellas part-time, durante 4 meses.
 
Además faltó explicar **por qué 10 y no 6 ni 15**. El número tiene que salir de un razonamiento y no de una cifra redonda. Cada riesgo gestionado cuesta trabajo: monitorear su disparador, ejecutar la mitigación y tener lista la contingencia. La justificación tiene que mostrar cuántos riesgos puede sostener ese equipo en ese plazo. Conviene reforzarla con uno de estos dos criterios, o con ambos:
 
* **Pareto** (Pressman): alrededor del 80 % de la exposición total suele concentrarse en unos pocos riesgos. Se suma la exposición acumulada y se muestra en qué punto se alcanza ese umbral.
* **Salto natural en los valores de E**: cortar donde hay un escalón claro, por ejemplo entre 1,8 y 1,5, y no en medio de un grupo de valores iguales.
**1.2 La probabilidad tiene que reflejar lo que dice el enunciado.**
 
Al riesgo de la consultora (R29) le pusimos P \= 0,4 y quedó en el puesto 19\. Pero el enunciado dice textualmente que la consultora **no garantiza** la entrega a tiempo. Cuando una fuente afirma explícitamente que algo no está garantizado, la probabilidad es alta. Otro grupo lo valoró con E \= 2,8 y lo puso primero en su tabla.
 
**Regla:** si el texto da evidencia directa ("no garantiza", "ningún miembro tiene experiencia", "no está definido"), la probabilidad se ubica en la franja alta, de 0,7 en adelante. Sin evidencia, se parte de valores medios y se justifica el número.
 
**1.3 Analizamos el enunciado en vez del proyecto.**
 
Ocho de los 30 riesgos eran **omisiones del enunciado**, por ejemplo "no se menciona repositorio", "no se menciona metodología" o "no está definido si el equipo maneja Angular". Que un dato falte en el texto no es un riesgo del proyecto. Algunos sí apuntan a un riesgo real, pero hay que redactarlos como tal:
 
| ❌ Omisión del enunciado | ✅ Riesgo del proyecto |
| :---- | :---- |
| No se menciona entorno de testing | Sin un entorno de pruebas separado, los errores se detectan en producción y afectan pagos reales |
| No está definido si el equipo maneja Angular | (solo si hay indicios) Si el equipo no domina Angular, el frontend se atrasa y compromete la entrega del flujo de pago |
 
**Prueba rápida:** si el riesgo empieza con "no se menciona…" o "no está definido…", está mal planteado. Hay que preguntarse qué le pasaría al proyecto en ese caso.
 
## 
 
## **2\. Correcciones de formato**
 
**2.1 El informe tiene que poder leerse sin el anexo.**
 
Los puntos c (ordenamiento) y e (planes) estaban solamente en el Excel. En el informe, la lista aparecía ordenada pero sin P, I ni E, así que no se podía verificar el orden ni de dónde salía el umbral de 1,8.
 
**Regla:** el informe contiene todo lo necesario para seguir el razonamiento: la tabla ordenada con P, I y E, la línea de corte marcada y los planes de los riesgos gestionados. El anexo (Excel) queda para el detalle.
 
## **3\. Correcciones de redacción**
 
**3.1 Cada riesgo tiene su propia consecuencia.**
 
Trece riesgos compartían la consecuencia con otro: cinco terminaban en "complica los tiempos y la dificultad del desarrollo" y cuatro en "puede generar problemas legales". El impacto se deriva de la consecuencia. Si la frase se repite pegada, el impacto no se pensó riesgo por riesgo.
 
**Regla:** la consecuencia tiene que ser concreta y medible (qué se atrasa, qué se rompe, a quién afecta y cuánto). Si dos riesgos terminan igual, hay que revisarlos.
 
**3.2 No duplicar riesgos.**
 
R06 y R07 ("nadie integró MercadoPago" y "nadie integró PayPal") son el mismo riesgo. Además, el enunciado dice que todavía no se definió cuál será la pasarela principal. Pasa lo mismo con R01 y R02 (volumen de usuarios y volumen de transacciones). Se fusionan en un único riesgo.
 
Cuando se fusionan riesgos, la lista queda con menos de 30\. Hay que completarla con riesgos nuevos y genuinos, no con variantes de los mismos.
 
## **4\. Para pensar: coherencia entre mitigación e impacto**
 
R05 era el riesgo número uno, con impacto catastrófico, y la mitigación propuesta era "aprovechar documentación oficial y fomentar el autoaprendizaje". Si el problema se resuelve leyendo documentación gratuita, el impacto no puede ser catastrófico.
 
**Regla:** cuando la mitigación es mucho más barata que el impacto, uno de los dos está mal estimado. O el impacto es menor, o la mitigación no alcanza y hay que proponer algo proporcional. En este caso, además, "sin presupuesto de capacitación" es una **restricción** y no un riesgo. El riesgo real es la curva de aprendizaje de Spring Boot y de las pasarelas, y su consecuencia concreta sobre el cronograma.
 
## **Guía para la ISFPP: checklist por riesgo**
 
1. **Forma condición → consecuencia**: "Dado que \[hecho del proyecto\], puede ocurrir que \[consecuencia concreta\]".
2. **Es del proyecto, no del enunciado**: nada de "no se menciona…".
3. **No se repite**: si se solapa con otro, se fusionan.
4. **La probabilidad se justifica con evidencia**: si hay afirmación explícita, P alta.
5. **El impacto sale de su propia consecuencia**: no de una frase genérica compartida.
6. **La mitigación es proporcional al impacto**.
7. **Tiene disparador y responsable**: cuándo se activa la contingencia y quién la ejecuta.
## **Guía para el conjunto de riesgos**
 
* **Tabla ordenada por E \= P × I, con los tres valores visibles en el informe.**
* **Línea de corte justificada por la capacidad del equipo**, con el número explicado (Pareto, salto natural en E o ambos).
* **Planes de reducción y contingencia en el informe**, al menos para los riesgos que quedan sobre la línea.
* **Anexo solo para el detalle.**