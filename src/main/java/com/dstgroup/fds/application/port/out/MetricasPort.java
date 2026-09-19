package com.dstgroup.fds.application.port.out;

/**
 * Port de saída (Onion): regista métricas de negócio para observabilidade
 * (Fase 5, Parte 4) — abstrai <b>como</b> e <b>onde</b> as métricas ficam
 * expostas (Micrometer/Actuator hoje; outra ferramenta amanhã) da mesma
 * forma que {@link EventPublisherPort} abstrai a publicação de eventos.
 *
 * <p>Deliberadamente com métodos nomeados por evento de negócio concreto
 * (não um genérico {@code incrementar(String nome)}) — segue o mesmo
 * princípio de {@link AutenticacaoPort}/{@link NotificadorPort}: a
 * Application fala vocabulário de negócio, nunca vocabulário genérico de
 * infraestrutura. Só se acrescenta um método aqui quando há um evento de
 * negócio concreto que valha a pena medir — não é um "escape hatch" para
 * métricas arbitrárias.</p>
 */
public interface MetricasPort {

	/**
	 * Uma nova FDS foi criada com sucesso (RF01) — rascunho ou já completa.
	 */
	void incrementarFDSCriadas();

	/**
	 * Uma FDS transitou para {@code OBSOLETA} (RF08/RF09) — tipicamente pelo
	 * job agendado de obsolescência, mas o método em si é agnóstico de quem
	 * despoletou a transição.
	 */
	void incrementarFDSMarcadasObsoletas();

	/**
	 * Um novo ticket de pedido de FDS a um fornecedor foi aberto (RF07).
	 */
	void incrementarTicketsAbertos();
}
