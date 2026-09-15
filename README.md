# pyCarteggio
Software per esercizi di carteggio nautico sulla carta 5D. 

Questa applicazione è pensata per risolvere esercizi del carteggio nautico per l'esame della patente nautica
senza limiti dalla costa tramite una interfaccia semplificata ma corrispondente per quanto possibile agli strumenti
disponibili per il carteggio su una carta fisica.

## Installazione
Per installare l'applicazione è necessario avere installato Python 3.7 o superiore e il gestore di pacchetti pip.
Le dipendenze necessarie sono matplotlib e PyQt5. Per installarle, eseguire il seguente comando:
```
pip install -r requirements.txt
```
Per Windows, è disponibile un installatore nella pagina delle release.

## Utilizzo
Il programma offre tre strumenti per la risoluzione degli esercizi, che si selezionano tramite i pulsanti in basso
a destra della finestra.

In generale, cliccare su un pulsante crea un nuovo strumento, che diventa attivo. Cliccando col tasto sinistro e
destro del mouse modifica il comportamento dello strumento. 
Le informazioni relative ai vari elementi creati sulla carta si leggono sulla lista che si viene a comporre sul
lato destro della finestra.

### Coordinate
Questo strumento permette di ottenere le coordinate di un punto sulla carta. Per ottenere le coordinate, è necessario
cliccare col tasto sinistro sul punto desiderato. Le coordinate vengono visualizzate nella lista a destra.

### Linea
Questo strumento permette di tracciare una linea sulla carta. Per tracciare una linea, è necessario cliccare col tasto
sinistro su un punto della carta, e poi cliccare col tasto destro su un altro punto. La linea viene visualizzata
sulla carta, e la sua direzione viene visualizzata nella lista a destra. Come con una squadretta, le due direzioni
opposte vengono visualizzate come gradi, e sta all'utente scegliere quella giusta.

### Cerchio
Questo strumento permette di tracciare un cerchio sulla carta. Il tasto sinistro definisce il centro del cerchio,
mentre il tasto destro ne definisce il raggio. La circonferenza viene visualizzata sulla carta, e il raggio in miglia
viene visualizzato nella lista a destra.

### Zoom
Per zoomare sulla carta, cliccare sulla icono a forma di lente di ingrandimento nella parte alta della finestra, e 
tracciare il rettangolo sul quale si vuole zoomare. Per tornare alla vista normale, cliccare sulla icona a forma di
casetta.
Deselezionare lo strumento zoom cliccandoci nuovamente sopra prima di poter tracciare o modificare un elemento.
Dal menu a tendina in basso a destra, si possono selezionare alcune viste predefinite.

## Versione web

Nella cartella `web/` è disponibile una versione dell'applicazione eseguibile in un browser (desktop o tablet),
senza bisogno di installare Python o dipendenze. Supporta il tocco: un tap posiziona il punto/centro attivo,
il pizzico a due dita zooma e, con "Sposta" attivo (oppure tenendo premuto il tasto centrale del mouse), un
dito o il mouse trascina la carta. Il pulsante "Zoom" attiva lo strumento per ingrandire su un rettangolo:
trascinando sulla carta si disegna il riquadro dell'area da ingrandire, e lo strumento resta attivo per
ripetere l'operazione finché non lo si disattiva cliccandoci di nuovo sopra (esattamente come nella versione
desktop).

Su un dispositivo touch, attivando la casella "Interfaccia touch" nella barra laterale compare il controllo
"Prossimo tocco" (pulsanti "①/②") per lo strumento Linea/Cerchio, che seleziona quale punto verrà impostato dal
tocco successivo (equivalente al click sinistro/destro del mouse, che invece funziona sempre normalmente anche
a casella disattivata). La preferenza resta salvata nel browser tra una sessione e l'altra.

Il pannello "Note" si può trascinare liberamente ovunque nella finestra tramite la sua barra del titolo.

I pulsanti in basso a destra permettono di:
- **Salva / Carica**: salvare punti, linee, cerchi e note correnti in un file JSON, per riprendere l'esercizio
  in un secondo momento (anche su un altro dispositivo);
- **PNG / SVG**: esportare la vista attualmente visibile (con gli elementi disegnati) come immagine. Il PNG è
  una semplice istantanea dello schermo; l'SVG incorpora il ritaglio della carta come immagine raster ma disegna
  punti, linee e cerchi come vettori, così restano nitidi anche ingrandendo il file in un editor vettoriale.

Per usarla in locale (anche da un tablet sulla stessa rete):
```
cd web
python3 -m http.server 8000
```
poi aprire `http://localhost:8000` (o l'indirizzo IP del computer sulla rete locale, dal tablet). In alternativa
si può pubblicare il contenuto della cartella `web/` su un qualsiasi hosting statico. Le funzioni di esportazione
(PNG/SVG) richiedono che la pagina sia servita tramite HTTP(S): aprendo `index.html` direttamente come file locale
(`file://`) il browser blocca l'esportazione per motivi di sicurezza.