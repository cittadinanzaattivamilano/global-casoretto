# Global Casoretto

Come potrebbe cambiare il Casoretto (Municipio 3, Milano): nove idee tra piazze senza auto, strade più sicure e più alberi.

**Sito:** https://cittadinanzaattivamilano.github.io/global-casoretto/

- **Una sola mappa del quartiere**, con tutti i progetti disegnati al loro posto. Più ci si avvicina, più dettagli compaiono.
- **Oggi / Domani**: un interruttore mostra lo stato attuale e il progetto.
- **Giro guidato**: il pulsante "Avanti" porta da un luogo al successivo, con poche righe in parole semplici.
- **Per approfondire**: una pagina tecnica per ogni tavola e tutte le tavole scaricabili in PDF e PNG (`tavole/`).

| N. | Luogo |
|---|---|
| 1 | Piazza Durante |
| 2 | Affaccio su piazza Durante |
| 3 | La passeggiata di via Casoretto |
| 4 | Piazza San Materno |
| 5 | Cinema del Casoretto |
| 6 | Viale Lombardia |
| 7 | Via Teodosio |
| 8 | Via Porpora |
| 9 | Largo Gemito |

Idee di concept: misure e numeri sono indicativi.

## Com'è fatto

Sito statico, senza build: HTML, CSS e JavaScript, con [Leaflet](https://leafletjs.com/) (BSD-2-Clause) per la mappa. La mappa è fatta di tasselli già disegnati in `tiles/oggi` e `tiles/domani`; i testi e i punti sono in `assets/data.js`. Pubblicato con GitHub Pages dal ramo `main`.

## Fonti

"Oggi" è lo stato attuale secondo il Database Topografico 2020 del Comune di Milano (CC BY 4.0) e il censimento degli alberi (open data, marzo 2025). Fermate e linee: ATM, open data del Comune di Milano. Ferrovia: © OpenStreetMap contributors. Via Porpora riprende la proposta «Via Porpora si Cura» di Città delle Persone e del comitato Verde Porpora.
